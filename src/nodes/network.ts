import { LGraphNode, IWidget, LiteGraph, SerializedLGraphNode } from "../core/LiteGraph.js";

interface WebSocketData {
    type: number;
    room?: string;
    channel?: number;
    data?: any;
    action?: string;
    msg?: any;
}

interface LGWebSocketNode extends LGraphNode {
    properties: {
        url: string;
        room: string;
        only_send_changes: boolean;
    };
    _ws: WebSocket | null;
    _last_sent_data: string[];
    _last_received_data: any[];
    boxcolor?: string;
}

class LGWebSocket implements LGWebSocketNode {
    properties: {
        url: string;
        room: string;
        only_send_changes: boolean;
    };
    _ws: WebSocket | null;
    _last_sent_data: string[];
    _last_received_data: any[];
    boxcolor?: string;
    size: [number, number] = [60, 20];

    constructor() {
        this.addInput("send", LiteGraph.ACTION);
        this.addOutput("received", LiteGraph.EVENT);
        this.addInput("in", 0);
        this.addOutput("out", 0);
        this.properties = {
            url: "",
            room: "lgraph",
            only_send_changes: true
        };
        this._ws = null;
        this._last_sent_data = [];
        this._last_received_data = [];
    }

    onPropertyChanged(name: string, value: any): void {
        if (name == "url") {
            this.connectSocket();
        }
    }

    onExecute(): void {
        if (!this._ws && this.properties.url) {
            this.connectSocket();
        }

        if (!this._ws || this._ws.readyState != WebSocket.OPEN) {
            return;
        }

        const room = this.properties.room;
        const only_changes = this.properties.only_send_changes;

        for (let i = 1; i < this.inputs.length; ++i) {
            const data = this.getInputData(i);
            if (data == null) {
                continue;
            }
            let json: string;
            try {
                json = JSON.stringify({
                    type: 0,
                    room: room,
                    channel: i,
                    data: data
                });
            } catch (err) {
                continue;
            }
            if (only_changes && this._last_sent_data[i] == json) {
                continue;
            }

            this._last_sent_data[i] = json;
            this._ws.send(json);
        }

        for (let i = 1; i < this.outputs.length; ++i) {
            this.setOutputData(i, this._last_received_data[i]);
        }

        if (this.boxcolor == "#AFA") {
            this.boxcolor = "#6C6";
        }
    }

    connectSocket(): void {
        const that = this;
        let url = this.properties.url;
        if (url.substr(0, 2) != "ws") {
            url = "ws://" + url;
        }
        this._ws = new WebSocket(url);
        this._ws.onopen = function() {
            console.log("ready");
            that.boxcolor = "#6C6";
        };
        this._ws.onmessage = function(e: MessageEvent) {
            that.boxcolor = "#AFA";
            const data = JSON.parse(e.data) as WebSocketData;
            if (data.room && data.room != that.properties.room) {
                return;
            }
            if (data.type == 1) {
                if (
                    data.data?.object_class &&
                    LiteGraph[data.data.object_class]
                ) {
                    let obj = null;
                    try {
                        obj = new LiteGraph[data.data.object_class](data.data);
                        that.triggerSlot(0, obj);
                    } catch (err) {
                        return;
                    }
                } else {
                    that.triggerSlot(0, data.data);
                }
            } else {
                that._last_received_data[data.channel || 0] = data.data;
            }
        };
        this._ws.onerror = function(e: Event) {
            console.log("couldnt connect to websocket");
            that.boxcolor = "#E88";
        };
        this._ws.onclose = function(e: CloseEvent) {
            console.log("connection closed");
            that.boxcolor = "#000";
        };
    }

    send(data: any): void {
        if (!this._ws || this._ws.readyState != WebSocket.OPEN) {
            return;
        }
        this._ws.send(JSON.stringify({ type: 1, msg: data }));
    }

    onAction(action: string, param: any): void {
        if (!this._ws || this._ws.readyState != WebSocket.OPEN) {
            return;
        }
        this._ws.send(JSON.stringify({
            type: 1,
            room: this.properties.room,
            action: action,
            data: param
        }));
    }

    onGetInputs(): [string, number][] {
        return [["in", 0]];
    }

    onGetOutputs(): [string, number][] {
        return [["out", 0]];
    }
}

LGWebSocket.title = "WebSocket";
LGWebSocket.desc = "Send data through a websocket";

interface HTTPRequestNode extends LGraphNode {
    properties: {
        url: string;
    };
    _data: any;
    _fetching: Promise<any> | null;
    boxcolor?: string;
}

class HTTPRequest implements HTTPRequestNode {
    properties: {
        url: string;
    };
    _data: any;
    _fetching: Promise<any> | null;
    boxcolor?: string;

    constructor() {
        this.addInput("request", LiteGraph.ACTION);
        this.addInput("url", "string");
        this.properties = {
            url: ""
        };
        this.addOutput("ready", LiteGraph.EVENT);
        this.addOutput("data", "string");
        this.addWidget("button", "Fetch", null, this.fetch.bind(this));
        this._data = null;
        this._fetching = null;
    }

    async fetch(): Promise<void> {
        const url = this.properties.url;
        if (!url) {
            return;
        }

        this.boxcolor = "#FF0";
        try {
            this._fetching = fetch(url)
                .then(resp => {
                    if (!resp.ok) {
                        this.boxcolor = "#F00";
                        this.trigger("error");
                        return null;
                    }
                    this.boxcolor = "#0F0";
                    return resp.text();
                })
                .then(data => {
                    if (data !== null) {
                        this._data = data;
                        this.trigger("ready", data);
                    }
                });
        } catch (err) {
            this.boxcolor = "#F00";
            this.trigger("error");
        }
    }

    onAction(evt: string): void {
        if (evt == "request") {
            this.fetch();
        }
    }

    onExecute(): void {
        this.setOutputData(1, this._data);
    }

    onGetOutputs(): [string, string][] {
        return [["error", LiteGraph.EVENT]];
    }
}

HTTPRequest.title = "HTTP Request";
HTTPRequest.desc = "Fetch data through HTTP";

// Register node types
if (typeof window !== 'undefined') {
    const LG = window.LiteGraph;
    LG.registerNodeType("network/websocket", LGWebSocket);
    LG.registerNodeType("network/httprequest", HTTPRequest);
}
