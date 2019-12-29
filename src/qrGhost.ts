import qrWrapper from "./qrWrapper.js";

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

    private debug : boolean = true;
    private extendedDebugging : HTMLTextAreaElement = null;

    constructor() {
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
            this.log("no media device support");
            return;
        }

        this.videoContainer.style.display = "block";
        navigator.mediaDevices.getUserMedia(this.videoConstraints)
            .then((stream : MediaStream) => {
                this.log("video stream found (" + stream.id + ")");
                stream.onremovetrack = (ev : MediaStreamTrackEvent) => {
                    this.log("video stream ended");
                }
                this.video.srcObject = stream;
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
                this.hideVideo();
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
        this.addClickListener(show, (e : Event) => {
            this.infoContainer.style.display = "block";
        });
        let hide = document.getElementById("hide-info-button");
        this.addClickListener(hide, (e : Event) => {
            this.infoContainer.style.display = "none";
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
            this.hideVideo();
            this.log("touch cancel");
        });
        this.addClickListener(cancel, (e : Event) => {
            this.hideVideo();
            this.log("click cancel");
        });
        this.detectVideoDevices();
    }

    private detectVideoDevices() {
        let constraints = navigator.mediaDevices.getSupportedConstraints();
        this.log("supported media constraints", constraints);
        this.log("devices:")
        navigator.mediaDevices.enumerateDevices().then((devices) => {
            for (let device of devices) {
                this.log("- " + device.kind + " : " + device.label + " | id: " + device.deviceId);
            }
        })
.catch(function(err) {
  console.log(err.name + ": " + err.message);
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
            if (o) {
                this.extendedDebugging.value += "\nOBJECT: " + o;
                for (let prop of Object.getOwnPropertyNames(o)) {
                    this.extendedDebugging.value += "\n " + prop + " : " + o[prop];
                }
            }
            this.extendedDebugging.scrollTop = this.extendedDebugging.scrollHeight;
        }
    }

    demoQrCode(file : string = "/assets/img/demo/qr-url.png") {
        this.qr.decodeImage(file, this.canvas);
    }
}
