(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = global || self, global.Ws = factory());
}(this, function () { 'use strict';

    function Ws(params) {
        if (!(this instanceof Ws)) {
            console.error('Ws is a constructor and should be called with the `new` keyword.');
        }
        this.options = Object.assign({}, {
            url: "",
            port: "",
            data: "",
            protocols: "",
            binaryType: "blob",
            isNeedHeatBeat: false,
            timeout: 3000,
            heatBeatTime: 5000,
            reconnectTime: 3000,
            heatBeatData: "ping"
        }, params);
        this.timer = {};
        this.createSocket();
    }

    Ws.prototype.close = function() {
        this.socket.close();
    }

    Ws.prototype.send = function(message) {
        if (this.socket) {
            this.socket.send(message);
        }else {
            console.error('Websocket is not initialized.');
        }
    }

    Ws.prototype.startHeartBeat = function() {
        var self = this;
        if(this.timer.timer_live) {
            clearTimeout(this.timer.timer_live);
        }
        if(this.timer.timer_off) {
            clearTimeout(this.timer.timer_off);
        }
        this.timer.timer_live = setTimeout(function() {
            clearTimeout(self.timer.timer_live);
            self.socket.send(self.options.heatBeatData);
            self.timer.timer_off = setTimeout(function() {
                clearTimeout(self.timer.timer_off);
                self.socket.close();
            }, self.options.timeout);
        }, self.options.heatBeatTime);
    }

    Ws.prototype.reconnect = function() {
        var self = this;
        if (this.isReconnect) {
            return false;
        }
        if (this.timer.timer_connect) {
            clearTimeout(this.timer.timer_connect);
        }
        this.timer.timer_connect = setTimeout(function() {
            clearTimeout(self.timer.timer_connect);
            self.createSocket();
        }, self.options.reconnectTime);
    }

    Ws.prototype.createSocket = function () {
        var self = this;
        var protocol = (location.protocol === 'http:') ? 'ws:' : 'wss:';
        var host = protocol + "//" + this.options.url + ":" + this.options.port;
        if(this.options.protocols) {
            this.socket = new WebSocket(host, this.options.protocols);
        }else {
            this.socket = new WebSocket(host);
        }
        if(this.options.binaryType) {
            this.socket.binaryType = this.options.binaryType;
        }

        this.isReconnect = true;
        this.extensions = this.socket.extensions;
        this.bufferedAmount = this.socket.bufferedAmount;
        this.protocol = this.socket.protocol;
        this.readyState = this.socket.readyState;
        this.url = this.socket.url;

        this.socket.onopen = function(event) {
            if(self.options.isNeedHeatBeat) {
                self.isReconnect = true;
                self.startHeartBeat();
            }
            if(self.options.onopen) {
                self.options.onopen(event);
            }
            
            if(self.options.data) {
                self.socket.send(self.options.data);
            }
        };
        this.socket.onmessage = function(event) {
            if(self.options.isNeedHeatBeat) {
                self.startHeartBeat();
            }
            if(self.options.onmessage) {
                self.options.onmessage(event.data);
            }
        };
        this.socket.onclose = function(event) {
            console.error(event);
            if(self.options.isNeedHeatBeat) {
                self.isReconnect = false;
                self.reconnect();
            }
            if(self.options.onclose) {
                self.options.onclose(event);
            }
        };
        this.socket.onerror = function(event) {
            console.error(event);
            if(self.options.onerror) {
                self.options.onerror(event);
            }
        };
    }

    return Ws;
}));