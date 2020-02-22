var cacheName = "qr-ghost-cache-v0.9";
var cachedFiles = [
    "assets/css/style.css",
    "assets/font/Apache License.txt",
    "assets/font/OpenSans-Regular.ttf",
    "assets/font/RobotoMono-Regular.ttf",
    "assets/img/qr-ghost.png",
    "assets/img/video-poster.png",
    "assets/img/codes/aztec-code.gif",
    "assets/img/codes/barcode.gif",
    "assets/img/codes/data-matrix.gif",
    "assets/img/codes/micro-qr-code.gif",
    "assets/img/codes/qr-code-large.gif",
    "assets/img/codes/qr-code.gif",
    "assets/img/demo/qr-url.png",

    "built/BackStack.js",
    "built/qrGhost.js",
    "built/qrWrapper.js",
    "built/VideoHelper.js",

    "lib/jsQR/jsQR.js",
    "lib/qrWorker/qrWorker.js",

    "index.html"
]

self.addEventListener("install", function(e) {
    log("install");
    e.waitUntil(buildCache());
});

function buildCache() {
    return caches.open(cacheName).then(function(cache) {
        return cache.addAll(cachedFiles);
    });
}

self.addEventListener("fetch", function(e) {
    log("fetch " + e.request.url);
    e.respondWith(caches.match(e.request).then(function(response) {
        return response || fetch(e.request).then(function(response) {
            return caches.open(cacheName).then(function(cache) {
                log("caching new resource " + e.request.url);
                cache.put(e.request, response.clone());
                return response;
            });
        });
    }));
});

self.addEventListener("activate", function(e) {
    log("activate");
    e.waitUntil(caches.keys().then(function(keyList) {
        return Promise.all(keyList.map(function(key) {
            if (key !== cacheName) {
                log("clearing old cache " + key)
                return caches.delete(key);
            }
        }));
    }));
});

function log(msg, o) {
    console.log("sw >> " + msg);
    if (o) {
        console.log(o);
    }
}