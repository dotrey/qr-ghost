export default class qrWrapper {
    constructor(resultHandler) {
        this.resultHandler = resultHandler;
        this.worker = new Worker("./lib/qrWorker/qrWorker.js");
        this.worker.onmessage = (e) => {
            const type = e.data.type;
            switch (type) {
                case "result":
                    this.resultHandler(e.data.data);
                    break;
                default:
                    break;
            }
        };
    }
    decodeVideo(canvas, video) {
        let context = canvas.getContext("2d");
        let sX = canvas.offsetLeft;
        if (video.offsetWidth > video.parentElement.offsetWidth) {
            sX += (video.offsetWidth - video.parentElement.offsetWidth) / 2;
        }
        let sY = canvas.offsetTop;
        let sW = Math.min(canvas.offsetWidth, video.offsetWidth);
        let sH = Math.min(canvas.offsetHeight, video.offsetHeight);
        let dW = canvas.offsetWidth;
        let dH = canvas.offsetHeight;
        let f = video.videoWidth / video.offsetWidth;
        sW *= f;
        sH *= f;
        sX *= f;
        sY *= f;
        context.imageSmoothingEnabled = false;
        context.drawImage(video, sX, sY, sW, sH, 0, 0, dW, dH);
        this.worker.postMessage({
            type: "decode",
            data: this.imageData(context)
        });
    }
    decodeImage(file, canvas) {
        canvas = canvas || document.createElement("canvas");
        let context = canvas.getContext("2d");
        context.imageSmoothingEnabled = false;
        let img = document.createElement("img");
        img.src = file;
        img.onload = () => {
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            img.parentElement.removeChild(img);
            this.worker.postMessage({
                type: "decode",
                data: this.imageData(context)
            });
        };
        document.body.appendChild(img);
    }
    imageData(context) {
        return context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    }
    scanMode(exhaustive = false) {
        if (exhaustive) {
            this.worker.postMessage({
                type: "scan-mode",
                data: "exhaustive"
            });
        }
        else {
            this.worker.postMessage({
                type: "scan-mode",
                data: "normal"
            });
        }
    }
}
//# sourceMappingURL=qrWrapper.js.map