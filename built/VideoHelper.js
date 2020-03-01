export default class VideoHelper {
    constructor(video, log) {
        this.video = video;
        this.log = log;
        this.assertPlayingTimeout = null;
        this.destroyAfterBlurTimeout = null;
        this.destroyAfterBlurDelay = 10;
        this.defaultFacingMode = "environment";
        this.videoConstraints = {
            video: {
                facingMode: "environment"
            },
            audio: false
        };
        this.onDeviceRetrieved = null;
        if (navigator.mediaDevices) {
            navigator.mediaDevices.addEventListener("devicechange", (ev) => {
                this.log("media devices have changed!");
            });
        }
        this.setup();
    }
    setup() {
        this.video.addEventListener("loadedmetadata", (e) => {
            this.assertVideoPlaying();
        });
        window.addEventListener("blur", (ev) => {
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
        window.addEventListener("focus", (ev) => {
            if (this.destroyAfterBlurTimeout) {
                this.log("focus gained, stop auto-release");
                window.clearTimeout(this.destroyAfterBlurTimeout);
                this.destroyAfterBlurTimeout = null;
            }
        });
    }
    play() {
        return new Promise((resolve, reject) => {
            let stream = this.video.srcObject;
            if (stream &&
                stream.active &&
                stream.getVideoTracks().filter((track) => {
                    return track.readyState === "live";
                }).length > 0) {
                this.log("re-using existing video stream");
                this.assertVideoPlaying();
                resolve(null);
            }
            else {
                this.log("requesting new video stream");
                let assignStream = (stream) => {
                };
                navigator.mediaDevices.getUserMedia(this.videoConstraints)
                    .then((stream) => {
                    this.log("video stream found (" + stream.id + ")");
                    let trackDeviceId = "";
                    for (let track of stream.getVideoTracks()) {
                        this.log("- " + track.label + " : " + track.id);
                        trackDeviceId = track.getSettings().deviceId;
                    }
                    this.enumerateBackCameras(trackDeviceId);
                    stream.onremovetrack = (ev) => {
                        this.log("video stream ended");
                    };
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
    assertVideoPlaying() {
        if (this.video.srcObject &&
            (this.video.paused || this.video.ended)) {
            try {
                this.log("asserting video playback...");
                this.video.play();
            }
            catch (ex) {
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
    selectDevice(deviceId) {
        this.release();
        this.videoConstraints = this.defaultFacingMode ? {
            audio: false,
            video: {
                deviceId: {
                    ideal: deviceId
                },
                facingMode: this.defaultFacingMode
            }
        } : {
            audio: false,
            video: {
                deviceId: {
                    ideal: deviceId
                }
            }
        };
        return this.play();
    }
    release() {
        this.log("releasing video stream");
        if (this.video.srcObject) {
            this.video.pause();
            try {
                this.video.srcObject
                    .getVideoTracks()
                    .forEach((track) => {
                    track.stop();
                });
            }
            catch (ex) {
                this.log("exception while ending video", ex);
            }
            this.video.srcObject = null;
        }
    }
    detectVideoDevices() {
        let constraints = navigator.mediaDevices.getSupportedConstraints();
        this.log("supported media constraints", constraints);
        this.log("devices:");
        navigator.mediaDevices.enumerateDevices().then((devices) => {
            let videoDevices = devices.filter((device) => {
                this.log("- " + device.kind + " : " + device.label + " | id: " + device.deviceId);
                return device.kind === "videoinput";
            });
            if (videoDevices.length > 0) {
                this.log("at least 1 camera found");
                videoDevices = videoDevices.filter((device) => {
                    return (device.label || "").indexOf("back") > -1;
                });
                if (videoDevices.length > 1) {
                    this.log("multiple backward facing cameras detected");
                    let firstDevice = null;
                    let lowest = -1;
                    let index = -1;
                    for (let device of videoDevices) {
                        let label = device.label.toLowerCase().replace(/[^a-z0-9 ]/, "");
                        let splitted = label.split(" ");
                        if (index < 0) {
                            for (let i = 0, ic = splitted.length; i < ic; i++) {
                                if ((Number(splitted[i]) + "") === splitted[i]) {
                                    index = i;
                                    break;
                                }
                            }
                        }
                        let value = Number(splitted[index]);
                        if (!isNaN(value) &&
                            (value < lowest || lowest < 0)) {
                            lowest = value;
                            firstDevice = device;
                        }
                    }
                    if (firstDevice) {
                        this.log("-> first device is ", firstDevice);
                        this.videoConstraints = {
                            audio: false,
                            video: {
                                deviceId: {
                                    ideal: firstDevice.deviceId
                                },
                                facingMode: "environment"
                            }
                        };
                        this.log("-> updated constraints", this.videoConstraints);
                    }
                    else {
                        this.log("-> unable to determine first device!");
                    }
                }
            }
            else if (!videoDevices.length) {
                this.log("no video devices detected");
                return false;
            }
        })
            .catch((e) => {
            this.log("error while enumerating devices", e);
        });
        return true;
    }
    enumerateBackCameras(trackDeviceId) {
        this.log("enumerating backward cameras");
        let done = (cameraDevices) => {
            this.log(".. done enumerating backwards cameras", cameraDevices);
            if (typeof this.onDeviceRetrieved === "function") {
                this.onDeviceRetrieved(cameraDevices, trackDeviceId);
            }
        };
        navigator.mediaDevices.enumerateDevices().then((devices) => {
            let cameraDevices = [];
            let videoDevices = devices.filter((device) => {
                return device.kind === "videoinput";
            });
            this.log(".. total cameras: " + videoDevices.length);
            if (videoDevices.length > 0) {
                let devicesWithLabel = 0;
                videoDevices = videoDevices.filter((device) => {
                    this.log(".. > " + device.label + " (" + device.deviceId + ")");
                    devicesWithLabel += !!device.label ? 1 : 0;
                    return (device.label || "").indexOf("back") > -1;
                });
                this.log(".. total backward cameras: " + videoDevices.length);
                if (videoDevices.length) {
                    let index = -1;
                    let ordered = [];
                    for (let device of videoDevices) {
                        let label = device.label.toLowerCase().replace(/[^a-z0-9 ]/, "");
                        let splitted = label.split(" ");
                        if (index < 0) {
                            for (let i = 0, ic = splitted.length; i < ic; i++) {
                                if ((Number(splitted[i]) + "") === splitted[i]) {
                                    index = i;
                                    break;
                                }
                            }
                        }
                        let value = Number(splitted[index]);
                        if (!isNaN(value)) {
                            ordered[value] = device;
                        }
                    }
                    cameraDevices = ordered.filter((d) => { return !!d; });
                }
                else if (devicesWithLabel === 0) {
                    cameraDevices = devices.filter((device) => {
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
        let cams = [];
        for (let i = 0; i < 5; i++) {
            cams.push({
                label: "camera " + i,
                deviceId: "" + i,
                groupId: "groupid",
                kind: "videoinput",
                toJSON: () => ""
            });
        }
        this.onDeviceRetrieved(cams, "1");
    }
}
//# sourceMappingURL=VideoHelper.js.map