import qrWrapper from "./qrWrapper.js";

export default class qrGhost {
    private canvas : HTMLCanvasElement;
    private result : HTMLDivElement;
    private container : HTMLElement;
    private video : HTMLVideoElement;
    private videoConstraints : MediaStreamConstraints = {
        video : true,
        audio : false
    }
    private videoContainer : HTMLElement;

    private qr : qrWrapper;

    constructor() {
        this.container = document.getElementById("main-container");
        this.videoContainer = document.getElementById("video-container");
        this.setupCanvas();
        this.setupResult();
        this.setupVideo();
        this.qr = new qrWrapper(this.displayResult.bind(this));
    }

    displayResult(result : string) {
        if (result.match(/^[a-z]*?:\/\//i)) {
            this.displayResultUrl(result);
        }else{
            this.displayResultGeneral(result);
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

    showVideo() {
        if (!navigator.mediaDevices) {
            this.log("no media device support");
            return;
        }

        this.videoContainer.style.display = "block";
        navigator.mediaDevices.getUserMedia(this.videoConstraints)
            .then((stream : MediaStream) => {
                this.log("video stream found");
                stream.onremovetrack = (ev : MediaStreamTrackEvent) => {
                    this.log("video stream ended");
                }
                this.video.srcObject = stream;
                this.video.play();
            })
            .catch((error) => {
                if (error.name === "ConstraintNotSatisfiedError") {
                    this.log("No video stream available for specified constraints.", this.videoConstraints);
                }else if (error.name === "PermissionDeniedError") {
                    this.log("User permission was denied.")
                }else{
                    this.log("Error while accessing video stream.", error);
                }
            });
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
            if (this.video.offsetHeight < this.video.width) {
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

    private setupResult() {
        this.result = document.getElementById("qr-result") as HTMLDivElement;
    }

    private setupVideo() {
        this.video = document.getElementById("qr-video") as HTMLVideoElement;
        this.video.addEventListener("play", (e : Event) => {
            this.log("playing");
            this.adjustVideoSize();
        });
    }

    private log(msg : string, o? : any) {
        console.log("qr ghost >> " + msg);
        if (o) {
            console.log(o);
        }
    }

    demoQrCode(file : string = "/assets/img/demo/qr-url.png") {
        this.qr.decodeImage(file, this.canvas);
    }
}
