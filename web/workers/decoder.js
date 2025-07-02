self.Module = {
    onRuntimeInitialized: function () {//Runtime准备就绪时通知执行
        self.decoder.onWasmLoaded();
        self.postMessage({
            message: "loaded",
        });
    }
};

importScripts('/workers/libffmpeg.js');

function Decoder() {
    this.logLevel = 0;
    this.webPlayer = null;//解码器实例
    this.cacheBuffer = null;//视频流缓存
    this.paramByteBuffer = null;//解码参数缓存
    this.watermarkBuffer = null;//水印缓存
    this.isDecoding = false;
    this.paramCount = 10;
    this.paramSize = 4;
    this.watermarkSize = 129;
}

self.decoder = new Decoder();

self.onmessage = function(event) {
    var objData = event.data;
    switch (objData.message) {
        case "init":
            self.decoder.createWebPlayer(objData.data);
            break;
        case "sendData":
            self.decoder.sendData(objData.data);
            break;
        case "startDecode":
            self.decoder.isDecoding = true;
            self.decoder.decodeFrame();
            break;
        case "stopDecode":
            self.decoder.stopDecode();
            break;
        case "close":
            self.decoder.close();
            break;
        case "clearPacketList":
            self.decoder.clearPacketList();
            break;
        default:
            console.log("Unsupport messsage: " + objData.status);
    }
}

/**
 * 初始化
 */
Decoder.prototype.onWasmLoaded = function() {
    Module._setLogLevel(this.logLevel);
    var chunkSize = 512 * 1024;
    this.cacheBuffer = Module._malloc(chunkSize);
    this.paramByteBuffer = Module._malloc(this.paramCount * this.paramSize);
    this.watermarkBuffer= Module._malloc(this.watermarkSize);
}

/**
 * 创建播放器
 */
Decoder.prototype.createWebPlayer = function(videoType) {
    this.webPlayer = Module._createWebPlayer(videoType);
    self.postMessage({
        message: "initSuccess",
    });
}

/**
 * 帧数据送入ffmpeg
 */
Decoder.prototype.sendData = function(data) {
    var uint8Array = new Uint8Array(data);
    Module.HEAPU8.set(uint8Array, this.cacheBuffer);
    var ret = Module._pushWebAVPacket(this.webPlayer, this.cacheBuffer, uint8Array.byteLength);
}

/**
 * 开始解码
 */
Decoder.prototype.decodeFrame = function() {
    setTimeout(function() {
        self.decoder.decodeFrame();
    }, 0);
    if(!this.isDecoding) {
        return;
    }
    var retArray = Module._decodeFrame(this.webPlayer, this.paramByteBuffer, this.paramCount, this.watermarkBuffer);
    var paramIntBuff = this.paramByteBuffer >> 2;
    var paramArray = Module.HEAP32.subarray(paramIntBuff, paramIntBuff + this.paramCount);
    var decodeArray = Module.HEAPU8.subarray(retArray, retArray + paramArray[2]);
    var decodeData = new Uint8Array(decodeArray);
    var watermarkArray = Module.HEAPU8.subarray(this.watermarkBuffer, this.watermarkBuffer + paramArray[9]);
    var watermarkData = new Uint8Array(watermarkArray);

    if (paramArray[0] !== 0) { //解码失败
        return;
    }

    var objData;
    var data;
    var type = paramArray[1];
    if (type === 1) {// 视频流
        data = {
            buffer: decodeData,
            timestamp: paramArray[3],
            width: paramArray[4],
            height: paramArray[5],
            watermark: watermarkData
        }
        objData = {
            message: "onVideoFrame",
            data: data,
        }
    }
    if (type === 0) {// 音频流
        data = {
            buffer: decodeData,
            timestamp: paramArray[3],
            channels: paramArray[6],
            sampleRate: paramArray[7],
            sampleFmt: paramArray[8]
        }
        objData = {
            message: "onAudioFrame",
            data: data,
        }
    }
    if(objData) {
        self.postMessage(objData);
    }
}

/**
 * 停止解码
 */
Decoder.prototype.stopDecode = function() {
    this.isDecoding = false;
}

/**
 * 关闭播放器
 */
Decoder.prototype.close = function() {
    Module._destroyWebPlayer(this.webPlayer);
    Module._free(this.paramByteBuffer);
    cacheBuffer = null;
    paramByteBuffer = null;
}

/**
 * 清空播放器队列
*/
Decoder.prototype.clearPacketList = function() {
    Module._clearPacketList(this.webPlayer);
}