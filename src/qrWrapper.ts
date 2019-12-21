export default class qrWrapper {
    private worker : Worker;
    private resultHandler : (result : string) => void;

    constructor(resultHandler : (result : string) => void) {
        this.resultHandler = resultHandler;
        this.worker = new Worker("/lib/qrWorker/qrWorker.js");

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