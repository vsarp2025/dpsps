importScripts('/workers/websocket.js')

self.downloader = new Downloader();

self.onmessage = function(event) {
    var objData = event.data;
    switch (objData.message) {
        case "create":
            self.downloader.createWebSocket(objData.data);
            self.downloader.params = objData.data;
            break;
        case "sendRequest":
            self.downloader.sendRequest(objData.data);
            break;
        case "close":
            self.downloader.close();
            break;
        case "stopHeartBeat":
            self.downloader.ws.options.isNeedHeatBeat = false;
            break;
        default:
            console.log("Unsupport messsage: " + objData.message);
    }
}

function Downloader() {
    this.ws = null;
    this.params = null;
}

/**
 * 建立连接
 */
Downloader.prototype.createWebSocket = function(params) {
    var objData;
    this.ws = new Ws({
        url: params.url,
        port: params.port,
        binaryType: params.binaryType,
        isNeedHeatBeat: params.isNeedHeatBeat,
        onopen: function() {
            objData = {
                message: "onopen",
            };
            self.postMessage(objData);
        },
        onmessage: function(data) {
            objData = {
                message: "sendData",
                data: data,
            };
            self.postMessage(objData);
        },
        onerror: function() {
            objData = {
                message: "wssConnect"
            }
            self.postMessage(objData);
        }
    });
}

/**
 * 发送请求
 */
Downloader.prototype.sendRequest = function(data) {
    if(this.ws) {
        if(typeof data === "object") {
            this.ws.send(JSON.stringify(data));
        }else {
            this.ws.send(data);
        }
    }else {
        console.error("Websocket connection has not been created!")
    }
}

/**
 * 关闭连接
 */
Downloader.prototype.close = function() {
    if(this.ws) {
        this.ws.close();
    }
}