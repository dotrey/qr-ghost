import qrWrapper from "./qrWrapper.js";
import BackStack from "./BackStack.js";

export default class qrGhost {
    private canvas : HTMLCanvasElement;
    private result : HTMLDivElement;
    private container : HTMLElement;
    private errorContainer : HTMLElement;
    private infoContainer : HTMLElement;
    private video : HTMLVideoElement;
    private videoConstraints : MediaStreamConstraints = {
        video : {
            facingMode : "environment"
        },
        audio : false
    }
    private videoContainer : HTMLElement;

    private qr : qrWrapper;
    private scanning : boolean = false;

    private backStack : BackStack;

    private debug : boolean = true;
    private extendedDebugging : HTMLTextAreaElement = null;

    constructor() {
        this.backStack = new BackStack();

        this.container = document.getElementById("main-container");
        this.infoContainer = document.getElementById("info-container");
        this.videoContainer = document.getElementById("video-container");
        this.errorContainer = document.getElementById("error");
        this.setupDebug();
        this.setupCanvas();
        this.setupResult();
        this.setupVideo();
        this.qr = new qrWrapper(this.displayResult.bind(this));
        this.hideVideo();
        this.setupInfo();
        this.log("initialized");
    }

    displayResult(result : string) {
        if (!result) {
            this.scan();
            return;
        }
        this.log("display result", result);
        if (result.match(/^[a-z]*?:\/\//i)) {
            this.displayResultUrl(result);
        }else{
            this.displayResultGeneral(result);
        }
        if (this.scanning) {
            this.stopScanning();
        }
    }

    private displayResultUrl(url : string) {
        let a = document.createElement("a");
        a.href = url;
        a.innerHTML = url;
        a.target = "_blank";
        this.result.innerHTML = "";
        this.result.appendChild(a);
    }

    private displayResultGeneral(result : string) {
        this.result.innerHTML = result;
    }

    private copyResult() {
        let result = this.result.innerText;
        let copySuccess = () => {
            this.result.classList.add("copied");
            window.setTimeout(() => {
                this.result.classList.remove("copied");
            }, 500);
        }
        if (!navigator.clipboard) {
            let ta = document.createElement("textarea");
            ta.setAttribute("style", "position: fixed;");
            ta.value = result;
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try {
                document.execCommand("copy");
                copySuccess();
            } catch (err) {
                this.log("copy to clipboard failed")
            }
            document.body.removeChild(ta)
        } else {
            navigator.clipboard.writeText(result).then(function() {
                copySuccess();
            }, function(err) {
                this.log("copy to clipboard failed")
            })
        }
    }

    hideVideo() {
        if (this.video.srcObject) {
            this.video.pause();
            this.video.srcObject = null;
        }
        this.videoContainer.style.display = "none";
    }

    showVideo() {
        // clear error
        this.error();
        if (!navigator.mediaDevices) {
            this.error("no media device support");
            return;
        }

        this.videoContainer.style.display = "block";
        this.backStack.push("video");
        navigator.mediaDevices.getUserMedia(this.videoConstraints)
            .then((stream : MediaStream) => {
                this.log("video stream found (" + stream.id + ")");
                for (let track of stream.getVideoTracks()) {
                    this.log("- " + track.label + " : " + track.id);
                }
                stream.onremovetrack = (ev : MediaStreamTrackEvent) => {
                    this.log("video stream ended");
                }
                this.video.srcObject = stream;
                this.video.play();
            })
            .catch((error) => {
                if (error.name === "ConstraintNotSatisfiedError" ||
                    error.name === "OverconstrainedError") {
                    this.error("No video stream available for specified constraints.", this.videoConstraints);
                }else if (error.name === "PermissionDeniedError" || 
                    error.name === "NotAllowedError") {
                    this.error("Permission to access camera is required.")
                }else{
                    this.error("Error while accessing video stream.", error);
                }
                // this.hideVideo();
                this.backStack.pop();
            });
    }

    private startScanning() {
        let context = this.canvas.getContext("2d");
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.scanning = true;
        this.scan();
        this.log("start scan...");
    }

    private scan() {
        if (!this.scanning || this.video.paused || this.video.ended) {
            this.log("... not scanning, video paused or ended");
            return;
        }
        this.qr.decodeVideo(this.canvas, this.video);
    }

    private stopScanning() {
        this.scanning = false;
        this.hideVideo();
        this.log("stopped scan");
    }

    private adjustVideoSize() {
        this.video.width = this.videoContainer.offsetWidth;
        let adjust = (time : number) => {
            console.log("offsetWidth " + this.video.offsetWidth);
            console.log("offsetHeight " + this.video.offsetHeight);
            console.log("width " + this.video.width);
            if (this.video.offsetWidth !== this.video.width) {
                console.log("-> retry");
                window.requestAnimationFrame(adjust);
                return;
            }

            // request an animation frame so the video can be layouted after setting the width
            if (this.video.offsetHeight < this.videoContainer.offsetWidth) {
                // make sure the video at least fills the cut-out area
                this.video.width = Math.ceil((this.video.width / this.video.offsetHeight) * this.video.width);
                this.log("new width " + this.video.width);
            }
        };
        window.requestAnimationFrame(adjust);
    }

    private setupCanvas() {
        this.canvas = document.getElementById("qr-image") as HTMLCanvasElement;
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    private setupInfo() {
        let show = document.getElementById("show-info-button");
        this.backStack.addPopHandler("info", () => {            
            this.infoContainer.style.display = "none";
        });
        this.addClickListener(show, (e : Event) => {
            this.infoContainer.style.display = "block";
            this.backStack.push("info");
        });
        let hide = document.getElementById("hide-info-button");
        this.addClickListener(hide, (e : Event) => {
            this.backStack.pop();
        });
        // hide the info overlay after a short moment
        // so the name and logo quickly flashes
        window.addEventListener("load", () => {
            window.setTimeout(() => {
                this.infoContainer.style.display = "none";
            }, 500);
        });
    }

    private setupResult() {
        let btn = document.getElementById("scan-button");
        this.addClickListener(btn, (e : Event) => {
            this.showVideo();
            this.log("touch scan");
        });
        this.addClickListener(btn, (e : Event) => {
            this.showVideo();
            this.log("click scan");
        });

        let copy = document.getElementById("copy-button");
        this.addClickListener(copy, (e: Event) => {
            this.copyResult();
        });

        this.result = document.getElementById("qr-result") as HTMLDivElement;
    }

    private setupVideo() {
        this.video = document.getElementById("qr-video") as HTMLVideoElement;
        this.video.addEventListener("play", (e : Event) => {
            this.log("playing");
            this.startScanning();
        });
        this.video.addEventListener("resize", (e : Event) => {
            this.log("resize");
            this.adjustVideoSize();
        });
        this.video.addEventListener("loadedmetadata", (e : Event) => {
            this.video.play();
        });

        let cancel = this.videoContainer.querySelector(".cancel");
        this.addClickListener(cancel, (e : Event) => {
            this.backStack.pop();
            this.log("touch cancel");
        });
        this.addClickListener(cancel, (e : Event) => {
            this.backStack.pop();
            this.log("click cancel");
        });
        this.detectVideoDevices();

        this.backStack.addPopHandler("video", this.hideVideo.bind(this));
    }

    private requestVideoDevices() {
        // if we have not yet requested the video device permission,
        // the enumeration of the devices holds no label-values
        // -> we need these labels to determine the camera on multi-cam devices
        // => request device permission on start up
        this.error();
        if (!navigator.mediaDevices) {
            this.error("no media device support");
            return;
        }

        this.log("requesting initial device permission")
        navigator.mediaDevices.getUserMedia(this.videoConstraints)
            .then((stream : MediaStream) => {
                this.log("camera permission granted");
                this.detectVideoDevices(true);
            })
            .catch((error) => {
                if (error.name === "ConstraintNotSatisfiedError" ||
                    error.name === "OverconstrainedError") {
                    this.error("No video stream available for specified constraints.", this.videoConstraints);
                }else if (error.name === "PermissionDeniedError" || 
                    error.name === "NotAllowedError") {
                    this.error("Permission to access camera is required.")
                }else{
                    this.error("Error while accessing video stream.", error);
                }
            });
    }

    private detectVideoDevices(isRetry : boolean = false) {
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
            // Note: some browsers (e.g. Firefox) do not provide a label
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
                this.error("no video devices detected")
            }
        })
        .catch((e) => {
            this.log("error while enumerating devices", e)
        });
    }

    private setupDebug() {
        if (location.search === "?debug") {
            this.extendedDebugging = document.createElement("textarea");
            this.extendedDebugging.classList.add("debug-area");
            document.body.appendChild(this.extendedDebugging);
        }
    }
 
    private addClickListener(element : Element, handler : (e:Event) => void) {
        element.addEventListener("touchstart", (e : Event) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            handler(e);
        });
        element.addEventListener("click", (e : Event) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            handler(e);
        });
    }

    private error(msg? : string, o? : any) {
        this.errorContainer.innerHTML = msg || "";
        if (!msg) {
            return;
        }
        this.log(msg, o);
    }

    private log(msg : string, o? : any) {
        if (!this.debug) {
            return;
        }

        console.log("qr ghost >> " + msg);
        if (o) {
            console.log(o);
        }
        if (this.extendedDebugging) {
            this.extendedDebugging.value += "\n" + msg;
            if (typeof o === "object") {
                this.extendedDebugging.value += "\nOBJECT: " + o;
                this.extendedDebugging.value += "\n" + 
                    JSON.stringify(o)
                        .replace(/\{/g, "{\n")
                        .replace(/\}/g, "\n}")
                        .replace(/,/g,",\n");
            }else if (o) {
                this.extendedDebugging.value += "\nVALUE: " + o;
            }
            this.extendedDebugging.scrollTop = this.extendedDebugging.scrollHeight;
        }
    }

    demoQrCode(file : string = "/assets/img/demo/qr-url.png") {
        this.qr.decodeImage(file, this.canvas);
    }
}
