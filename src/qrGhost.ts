import qrWrapper from "./qrWrapper.js";

export default class qrGhost {
    private canvas : HTMLCanvasElement;
    private result : HTMLDivElement;
    private container : HTMLElement;

    private qr : qrWrapper;

    constructor() {
        this.container = document.querySelector("main");
        this.createCanvas();
        this.createResult();
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

    private createCanvas() {
        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("image");
        this.container.appendChild(this.canvas);
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    private createResult() {
        this.result = document.createElement("div");
        this.result.classList.add("result");
        this.container.appendChild(this.result);
    }

    demoQrCode(file : string = "/assets/img/demo/qr-url.png") {
        this.qr.decodeImage(file, this.canvas);
    }
}
