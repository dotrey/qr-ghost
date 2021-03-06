export default class VideoHelper {
    private assertPlayingTimeout : number = null;

    // if the browser is no longer focused and the video
    // is not playing, we release our video handle to 
    // free up resources
    private destroyAfterBlurTimeout : number = null;
    destroyAfterBlurDelay : number = 10;

    private defaultFacingMode : string = "environment";
    videoConstraints : MediaStreamConstraints = {
        video : {
            facingMode : "environment"
        },
        audio : false
    }

    // callback that will be triggered when a camera is accessed the first time,
    // providing a list of backward facing camera devices and the id of the active
    // camera device (device id, not index of the array)
    onDeviceRetrieved : (devices : MediaDeviceInfo[], activeDeviceId : string) => void = null;

    constructor(public video : HTMLVideoElement, 
                public log : (msg : string, o? : any ) => void) {

        if (navigator.mediaDevices) {
            navigator.mediaDevices.addEventListener("devicechange", (ev : Event) => {
                this.log("media devices have changed!");
            });
        }

        this.setup();
    }

    private setup() {
        this.video.addEventListener("loadedmetadata", (e : Event) => {
            this.assertVideoPlaying();
        });

        // if the window looses the focus and the camera is not actively
        // used, we release our camera handle to free up resources after
        // a short while
        window.addEventListener("blur", (ev : FocusEvent) => {
            if (this.destroyAfterBlurTimeout ||
                !(this.video.paused || this.video.ended)) {
                return;
            }

            this.log("focus lost, init auto-release");
            this.destroyAfterBlurTimeout = window.setTimeout(() => {
                if (this.video.paused || this.video.ended) {
                    this.release();
                }
            }, this.destroyAfterBlurDelay * 1000);

        });

        window.addEventListener("focus", (ev : FocusEvent) => {
            if (this.destroyAfterBlurTimeout) {
                this.log("focus gained, stop auto-release");
                window.clearTimeout(this.destroyAfterBlurTimeout);
                this.destroyAfterBlurTimeout = null;
            }
        })
    }

    play() : Promise<DOMException> {
        return new Promise((resolve, reject) => {
            // If the video still has an active stream, don't request a new one
            // Note: this will be disadvantageous for Opera if the user selected
            // the wrong camera, as he has to reload the page to trigger a new
            // permission request
            let stream = this.video.srcObject as MediaStream;
            if (stream &&
                stream.active &&
                stream.getVideoTracks().filter((track : MediaStreamTrack) => {
                    return track.readyState === "live"
                }).length > 0) {
                
                // the stream exists and has an active video track
                this.log("re-using existing video stream");
                this.assertVideoPlaying();
                resolve(null);
            }else{
                // no stream or no active video track
                // -> request a new one
                this.log("requesting new video stream");
                navigator.mediaDevices.getUserMedia(this.videoConstraints)
                .then((stream : MediaStream) => {
                    this.log("video stream found (" + stream.id + ")");
                    let trackDeviceId : string = "";
                    for (let track of stream.getVideoTracks()) {
                        this.log("- " + track.label + " : " + track.id);
                        
                        trackDeviceId = track.getSettings().deviceId;
                    }
                    this.enumerateBackCameras(trackDeviceId);
                    stream.onremovetrack = (ev : MediaStreamTrackEvent) => {
                        this.log("video stream ended");
                    }
                    this.video.srcObject = stream;
                    this.assertVideoPlaying();
                    resolve(null);
                })
                .catch((error) => {
                    reject(error);
                });
            }     
        });
    }

    private assertVideoPlaying() {
        // if video has a src, is visible and not playing -> trigger play
        if (this.video.srcObject &&
            (this.video.paused || this.video.ended)) {
         
            try {
                this.log("asserting video playback...");
                this.video.play();
            }catch(ex) {
                this.log("exception while starting playback", ex);
            }
            this.assertPlayingTimeout = window.setTimeout(this.assertVideoPlaying.bind(this), 250);
        }
    }

    pause() {
        if (this.assertPlayingTimeout) {
            window.clearTimeout(this.assertPlayingTimeout);
            this.assertPlayingTimeout = null;
        }
        this.video.pause();
    }

    selectDevice(deviceId : string) : Promise<DOMException> {
        // release current device before switching device
        this.release();

        // update constraints with new device id
        this.videoConstraints = this.defaultFacingMode ? {
            audio : false,
            video : {
                deviceId : {
                    ideal : deviceId
                },
                facingMode : this.defaultFacingMode
            }
        } : {
            audio : false,
            video : {
                deviceId : {
                    ideal : deviceId
                }
            }
        }

        return this.play();
    }

    release() {
        this.log("releasing video stream")
        if (this.video.srcObject) {
            this.video.pause();
            try {
                (this.video.srcObject as MediaStream)
                    .getVideoTracks()
                    .forEach((track : MediaStreamTrack) => {
                        track.stop();
                    });
            }catch(ex) {
                this.log("exception while ending video", ex);
            }
            this.video.srcObject = null;
        }
    }

    detectVideoDevices() : boolean {
        let constraints = navigator.mediaDevices.getSupportedConstraints();
        this.log("supported media constraints", constraints);
        this.log("devices:");
        navigator.mediaDevices.enumerateDevices().then((devices : MediaDeviceInfo[]) => {
            // On devices with multiple cameras, the chrome browser provides
            // the first backwards facing camera in the list - which might 
            // not always be the default camera, but could e.g. be a zoom
            // camera (which is barely usable).
            // To counter this, we check how many backward facing cameras the
            // browser lists. Those cameras are usually numbered, but not
            // always provided in the numbered order
            // -> we fetch the backward facing camera with the lowest number

            // check the label and only keep those cameras facing back
            // Note: label is only available after camera permission was granted
            let videoDevices : MediaDeviceInfo[] = devices.filter((device : MediaDeviceInfo) => {
                this.log("- " + device.kind + " : " + device.label + " | id: " + device.deviceId);
                return device.kind === "videoinput";
            });

            if (videoDevices.length > 0) {
                this.log("at least 1 camera found");
                videoDevices = videoDevices.filter((device : MediaDeviceInfo) => {
                    return (device.label || "").indexOf("back") > -1;
                });

                if (videoDevices.length > 1) {
                    // if there is more than 1 backwards facing camera, get the one
                    // with the lowest number
                    this.log("multiple backward facing cameras detected");
                    let firstDevice : MediaDeviceInfo = null;
                    let lowest : number = -1;
                    let index : number = -1;
                    for (let device of videoDevices) {
                        // remove any chars not a-z, 0-9 or space
                        let label = device.label.toLowerCase().replace(/[^a-z0-9 ]/, "");
                        let splitted = label.split(" ");
                        if (index < 0) {
                            // on the first device, detect the index of the first pure number
                            for (let i = 0, ic = splitted.length; i < ic; i++) {
                                // convert to number and back to string, if equal the
                                // original string was a pure number
                                if ((Number(splitted[i]) + "") === splitted[i]) {
                                    index = i;
                                    break;
                                }
                            }
                        }
                        let value : number = Number(splitted[index]);
                        if (!isNaN(value) && 
                            (value < lowest || lowest < 0)) {
                            // currently lowest value
                            lowest = value;
                            firstDevice = device;
                        }
                    }
                    if (firstDevice) {
                        this.log("-> first device is ", firstDevice);
                        // update the video constraints to prefer the device
                        // with the id of the first device
                        this.videoConstraints = {
                            audio : false,
                            video : {
                                deviceId : {
                                    ideal : firstDevice.deviceId
                                },
                                facingMode : "environment"
                            }
                        }
                        this.log("-> updated constraints", this.videoConstraints);
                    }else{
                        this.log("-> unable to determine first device!");
                    }
                }                
            }else if (!videoDevices.length) {
                // if there are no video devices, this either means:
                // - we have no permission to access the devices yet, thus all labels were empty
                // - we are insinde e.g. Firefox Klar, which prevents all cam access
                this.log("no video devices detected")
                return false;
            }
        })
        .catch((e) => {
            this.log("error while enumerating devices", e)
        });
        return true;
    }

    private enumerateBackCameras(trackDeviceId : string) {
        this.log("enumerating backward cameras");
        let done = (cameraDevices : MediaDeviceInfo[]) => {
            this.log(".. done enumerating backwards cameras", cameraDevices);
            if (typeof this.onDeviceRetrieved === "function") {
                this.onDeviceRetrieved(cameraDevices, trackDeviceId);
            }
        }
        navigator.mediaDevices.enumerateDevices().then((devices : MediaDeviceInfo[]) => {    
            let cameraDevices : MediaDeviceInfo[] = [];        
            // check the label and only keep those cameras facing back
            // Note: label is only available after camera permission was granted
            let videoDevices : MediaDeviceInfo[] = devices.filter((device : MediaDeviceInfo) => {
                return device.kind === "videoinput";
            });
            this.log(".. total cameras: " + videoDevices.length);

            if (videoDevices.length > 0) {
                // filter for back facing cameras only
                let devicesWithLabel = 0;
                videoDevices = videoDevices.filter((device : MediaDeviceInfo) => {
                    this.log(".. > " + device.label + " (" + device.deviceId + ")");
                    devicesWithLabel += !!device.label ? 1 : 0;
                    return (device.label || "").indexOf("back") > -1;
                });
                this.log(".. total backward cameras: " + videoDevices.length);

                if (videoDevices.length) {
                    // if there are cameras, sort them by their internal order
                    let index : number = -1;
                    let ordered : MediaDeviceInfo[] = [];
                    for (let device of videoDevices) {
                        // remove any chars not a-z, 0-9 or space
                        let label = device.label.toLowerCase().replace(/[^a-z0-9 ]/, "");
                        let splitted = label.split(" ");
                        if (index < 0) {
                            // on the first device, detect the index of the first pure number
                            for (let i = 0, ic = splitted.length; i < ic; i++) {
                                // convert to number and back to string, if equal the
                                // original string was a pure number
                                if ((Number(splitted[i]) + "") === splitted[i]) {
                                    index = i;
                                    break;
                                }
                            }
                        }
                        let value : number = Number(splitted[index]);
                        if (!isNaN(value)) {
                            ordered[value] = device;
                        }
                    }
                    // remove empty values
                    cameraDevices = ordered.filter((d) => { return !!d});
                }else if (devicesWithLabel === 0){                    
                    // the devices have no labels, we can't tell wether they are
                    // front or back facing
                    // -> list all cameras so the user can still switch if required
                    //    and remove the facing-mode constraint in case the front
                    //    camera is selected
                    cameraDevices = devices.filter((device : MediaDeviceInfo) => {
                        return device.kind === "videoinput";
                    });
                    this.log(".. devices have no labels, remove facing-mode constraint");
                    this.defaultFacingMode = null;
                }
            }
            done(cameraDevices);
        })
        .catch((e) => {
            this.log("error while enumerating devices", e);
            done([]);
        });
    }

    demoDevices() {
        let cams : MediaDeviceInfo[] = [];
        for (let i = 0; i < 5; i++) {
            cams.push({
                label : "camera " + i,
                deviceId : "" + i,
                groupId : "groupid",
                kind : "videoinput",
                toJSON : () => ""
            });
        }
        this.onDeviceRetrieved(cams, "1");
    }
}