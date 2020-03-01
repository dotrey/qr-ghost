import qrWrapper from "./qrWrapper.js";
import BackStack from "./BackStack.js";
import VideoHelper from "./VideoHelper.js";
export default class qrGhost {
    constructor() {
        this.scanning = false;
        this.debug = true;
        this.extendedDebugging = null;
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
    displayResult(result) {
        if (!result) {
            this.scan();
            return;
        }
        this.log("display result", result);
        if (result.match(/^[a-z]*?:\/\//i)) {
            this.displayResultUrl(result);
        }
        else {
            this.displayResultGeneral(result);
        }
        if (this.scanning) {
            this.stopScanning();
        }
    }
    displayResultUrl(url) {
        let a = document.createElement("a");
        a.href = url;
        a.innerHTML = url;
        a.target = "_blank";
        this.result.innerHTML = "";
        this.result.appendChild(a);
    }
    displayResultGeneral(result) {
        this.result.innerHTML = result;
    }
    copyResult(retry = false) {
        let result = this.result.innerText;
        let copySuccess = () => {
            this.result.classList.add("copied");
            window.setTimeout(() => {
                this.result.classList.remove("copied");
            }, 500);
        };
        if (!navigator.clipboard || retry) {
            let ta = document.createElement("textarea");
            ta.setAttribute("style", "position: fixed;");
            ta.value = result;
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try {
                document.execCommand("copy");
                copySuccess();
            }
            catch (err) {
                this.log("copy to clipboard failed");
            }
            document.body.removeChild(ta);
        }
        else {
            navigator.clipboard.writeText(result).then(() => {
                copySuccess();
            }, (err) => {
                this.log("copy to clipboard failed, retry");
                this.copyResult(true);
            });
        }
    }
    hideVideo() {
        this.videoHelper.pause();
        this.videoContainer.style.display = "none";
    }
    showVideo() {
        this.error();
        if (!navigator.mediaDevices) {
            this.error("no media device support");
            return;
        }
        this.videoContainer.style.display = "block";
        this.video.style.visibility = "hidden";
        this.backStack.push("video");
        this.videoHelper.play()
            .then((value) => {
            this.video.style.visibility = "visible";
        })
            .catch((error) => {
            if (error.name === "ConstraintNotSatisfiedError" ||
                error.name === "OverconstrainedError") {
                this.error("No video stream available for specified constraints.");
            }
            else if (error.name === "PermissionDeniedError" ||
                error.name === "NotAllowedError") {
                this.error("Permission to access camera is required.");
            }
            else {
                this.error("Error while accessing video stream.", error);
            }
            this.backStack.pop();
        });
    }
    selectDevice(deviceId) {
        this.log("user select device: " + deviceId);
        this.video.style.visibility = "hidden";
        this.videoHelper.selectDevice(deviceId)
            .then((value) => {
            this.video.style.visibility = "visible";
        })
            .catch((error) => {
            if (error.name === "ConstraintNotSatisfiedError" ||
                error.name === "OverconstrainedError") {
                this.error("No video stream available for specified constraints.");
            }
            else if (error.name === "PermissionDeniedError" ||
                error.name === "NotAllowedError") {
                this.error("Permission to access camera is required.");
            }
            else {
                this.error("Error while accessing video stream.", error);
            }
            this.backStack.pop();
        });
    }
    startScanning() {
        let context = this.canvas.getContext("2d");
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.scanning = true;
        this.scan();
        this.log("start scan...");
    }
    scan() {
        if (!this.scanning || this.video.paused || this.video.ended) {
            this.log("... not scanning, video paused or ended");
            return;
        }
        this.qr.decodeVideo(this.canvas, this.video);
    }
    stopScanning() {
        this.scanning = false;
        this.hideVideo();
        this.log("stopped scan");
    }
    adjustVideoSize() {
        this.video.width = this.videoContainer.offsetWidth;
        let adjust = (time) => {
            console.log("offsetWidth " + this.video.offsetWidth);
            console.log("offsetHeight " + this.video.offsetHeight);
            console.log("width " + this.video.width);
            if (this.video.offsetWidth !== this.video.width) {
                console.log("-> retry");
                window.requestAnimationFrame(adjust);
                return;
            }
            if (this.video.offsetHeight < this.videoContainer.offsetWidth) {
                this.video.width = Math.ceil((this.video.width / this.video.offsetHeight) * this.video.width);
                this.log("new width " + this.video.width);
            }
        };
        window.requestAnimationFrame(adjust);
    }
    setupCanvas() {
        this.canvas = document.getElementById("qr-image");
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }
    setupInfo() {
        let show = document.getElementById("show-info-button");
        this.backStack.addPopHandler("info", () => {
            this.infoContainer.style.display = "none";
        });
        this.addClickListener(show, (e) => {
            this.infoContainer.style.display = "block";
            this.backStack.push("info");
        });
        let hide = document.getElementById("hide-info-button");
        this.addClickListener(hide, (e) => {
            this.backStack.pop();
        });
        window.addEventListener("load", () => {
            window.setTimeout(() => {
                this.infoContainer.style.display = "none";
            }, 500);
        });
        let img = this.infoContainer.querySelector(".about img");
        this.addClickListener(img, (e) => {
            let val = (img.getAttribute("data-debug") || "");
            if (val.length === 9) {
                this.setupDebug(true);
            }
            img.setAttribute("data-debug", val + ".");
        });
    }
    setupResult() {
        let btn = document.getElementById("scan-button");
        this.addClickListener(btn, (e) => {
            this.showVideo();
            this.log("touch scan");
        });
        this.addClickListener(btn, (e) => {
            this.showVideo();
            this.log("click scan");
        });
        let copy = document.getElementById("copy-button");
        this.addClickListener(copy, (e) => {
            this.copyResult();
        });
        this.result = document.getElementById("qr-result");
    }
    setupVideo() {
        this.video = document.getElementById("qr-video");
        this.video.addEventListener("play", (e) => {
            this.log("playing");
            this.startScanning();
        });
        this.video.addEventListener("resize", (e) => {
            this.log("resize");
            this.adjustVideoSize();
        });
        let cancel = this.videoContainer.querySelector(".cancel");
        this.addClickListener(cancel, (e) => {
            this.backStack.pop();
            this.log("touch cancel");
        });
        this.addClickListener(cancel, (e) => {
            this.backStack.pop();
            this.log("click cancel");
        });
        let exhaust = document.getElementById("exhaustive-scan-button");
        exhaust.addEventListener("change", () => {
            this.log("setting scan mode: " + (exhaust.checked ? "exhaustive" : "normal"));
            this.qr.scanMode(exhaust.checked);
        });
        this.videoHelper = new VideoHelper(this.video, this.log.bind(this));
        if (!this.videoHelper.detectVideoDevices()) {
            this.error("no video devices detected");
        }
        this.backStack.addPopHandler("video", this.stopScanning.bind(this));
        this.selectDeviceContainer = document.getElementById("select-device");
        this.selectDeviceContainer.style.display = "none";
        this.addClickListener(this.selectDeviceContainer, (e) => {
            this.backStack.pop();
        });
        let selectButton = document.getElementById("select-device-button");
        selectButton.style.display = "none";
        this.addClickListener(selectButton, (e) => {
            this.backStack.push("select-device");
            this.selectDeviceContainer.style.display = "block";
        });
        this.backStack.addPopHandler("select-device", () => {
            this.selectDeviceContainer.style.display = "none";
        });
        this.videoHelper.onDeviceRetrieved = (devices, activeDeviceId) => {
            let selectButton = document.getElementById("select-device-button");
            if (devices.length > 1) {
                this.selectDeviceContainer.innerHTML = "";
                let i = 1;
                for (let device of devices) {
                    let d = document.createElement("div");
                    d.classList.add("device");
                    if (device.deviceId === activeDeviceId) {
                        d.classList.add("active");
                    }
                    d.innerHTML = "Camera " + i++;
                    this.addClickListener(d, (e) => {
                        this.backStack.pop();
                        this.selectDevice(device.deviceId);
                    });
                    this.selectDeviceContainer.appendChild(d);
                }
                selectButton.style.display = "block";
            }
            else {
                selectButton.style.display = "none";
            }
        };
    }
    setupDebug(debug = false) {
        if (location.search === "?debug" || debug) {
            this.extendedDebugging = document.createElement("textarea");
            this.extendedDebugging.classList.add("debug-area");
            this.extendedDebugging.readOnly = true;
            document.body.appendChild(this.extendedDebugging);
        }
    }
    addClickListener(element, handler) {
        element.addEventListener("touchstart", (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            handler(e);
        });
        element.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            handler(e);
        });
    }
    error(msg, o) {
        this.errorContainer.innerHTML = msg || "";
        if (!msg) {
            return;
        }
        this.log(msg, o);
    }
    log(msg, o) {
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
                        .replace(/,/g, ",\n");
            }
            else if (o) {
                this.extendedDebugging.value += "\nVALUE: " + o;
            }
            this.extendedDebugging.scrollTop = this.extendedDebugging.scrollHeight;
        }
    }
    demoQrCode(file = "/assets/img/demo/qr-url.png") {
        this.qr.decodeImage(file, this.canvas);
    }
    demoDevices() {
        this.videoHelper.demoDevices();
    }
}
//# sourceMappingURL=qrGhost.js.map