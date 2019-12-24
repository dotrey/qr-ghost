importScripts("../jsQR/jsQR.js");

let inversionAttempts = "dontInvert";
let grayscaleWeights = {
    // weights for quick luma integer approximation (https://en.wikipedia.org/wiki/YUV#Full_swing_for_BT.601)
    red: 77,
    green: 150,
    blue: 29,
    useIntegerApproximation: true,
};

self.onmessage = function(e) {
    const type = e.data.type || "";

    switch (type) {
        case "decode":
            decode(e.data.data || null);
            break;

        case "ping":
            log("send pong")

        default:
            log("unknown action", type);
            break;
    }
}

function decode(data) {
    let result = null;
    if (data) {
        const rgbaData = data["data"];
        const width = data["width"];
        const height = data["height"];
        result = jsQR(rgbaData, width, height, {
            inversionAttempts: inversionAttempts,
            greyScaleWeights: grayscaleWeights,
        });
    }else{
        log("no data provided");
    }
    self.postMessage({
        type: "result",
        data: result ? result.data : null,
    });
}

function log(msg, o) {
    console.log("qr worker >> " + msg);
    if (typeof o !== "undefined") {
        console.log(o);
    }
}