export default class qrWrapper {
    private worker : Worker;
    private resultHandler : (result : string) => void;

    constructor(resultHandler : (result : string) => void) {
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
        }
    }

    decodeVideo(canvas : HTMLCanvasElement, video : HTMLVideoElement) {
        let context = canvas.getContext("2d");
        let sX = canvas.offsetLeft;
        if (video.offsetWidth > video.parentElement.offsetWidth) {
            // The video is resized to be high enough to cover the scan area.
            // This can cause the video to be wider than the parent element,
            // which is countered by centering it with css transformation.
            // The transformation however is not reflected in the offset-values
            // and must be added manually
            sX += (video.offsetWidth - video.parentElement.offsetWidth) / 2;
        }
        let sY = canvas.offsetTop;
        let sW = Math.min(canvas.offsetWidth, video.offsetWidth);
        let sH = Math.min(canvas.offsetHeight, video.offsetHeight);
        let dW = canvas.offsetWidth;
        let dH = canvas.offsetHeight;

        // scale the source dimensions based on the true video size
        let f = video.videoWidth / video.offsetWidth;
        sW *= f;
        sH *= f;
        sX *= f;
        sY *= f;

        context.imageSmoothingEnabled = false;
        context.drawImage(video, sX, sY, sW, sH, 0, 0, dW, dH);
        this.worker.postMessage({
            type : "decode",
            data : this.imageData(context)
        });
    }

    decodeImage(file : string, canvas : HTMLCanvasElement) {
        canvas = canvas || document.createElement("canvas");
        let context = canvas.getContext("2d");
        context.imageSmoothingEnabled = false;
        let img = document.createElement("img");
        img.src = file;
        img.onload = () => {
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            img.parentElement.removeChild(img);

            this.worker.postMessage({
                type : "decode",
                data : this.imageData(context)
            });
        }
        document.body.appendChild(img);
    }

    imageData(context : CanvasRenderingContext2D) {
        return context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    }
}