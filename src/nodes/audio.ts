import { LiteGraph } from '../litegraph';
import type { LGraphNode, Vector2, LGraphCanvas } from '../litegraph.d';

interface LGAudioContext extends AudioContext {
    onmessage?: (msg: any) => void;
    onended?: (msg: any) => void;
    oncomplete?: (msg: any) => void;
}

interface LGAudioNode extends AudioNode {
    audionode?: AudioNode;
}

class LGAudio {
    static _audio_context: LGAudioContext | null = null;
    static cached_audios: { [key: string]: AudioBuffer } = {};

    static getAudioContext(): LGAudioContext | null {
        if (!this._audio_context) {
            window.AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!window.AudioContext) {
                console.error("AudioContext not supported by browser");
                return null;
            }
            this._audio_context = new AudioContext() as LGAudioContext;
            this._audio_context.onmessage = (msg: any) => {
                console.log("msg", msg);
            };
            this._audio_context.onended = (msg: any) => {
                console.log("ended", msg);
            };
            this._audio_context.oncomplete = (msg: any) => {
                console.log("complete", msg);
            };
        }
        return this._audio_context;
    }

    static connect(audionodeA: LGAudioNode, audionodeB: LGAudioNode): void {
        try {
            audionodeA.connect(audionodeB);
        } catch (err) {
            console.warn("LGraphAudio:", err);
        }
    }

    static disconnect(audionodeA: LGAudioNode, audionodeB: LGAudioNode): void {
        try {
            audionodeA.disconnect(audionodeB);
        } catch (err) {
            console.warn("LGraphAudio:", err);
        }
    }

    static changeAllAudiosConnections(node: LGraphNode, connect: boolean): void {
        if (!node.inputs) return;

        for (let i = 0; i < node.inputs.length; ++i) {
            let input = node.inputs[i];
            if (!input || !input.link) continue;

            let link_info = node.graph?.links[input.link];
            if (!link_info) continue;

            let origin_node = node.graph?.getNodeById(link_info.origin_id);
            if (!origin_node) continue;

            let origin_audionode = (origin_node as any).audionode;
            let dest_audionode = (node as any).audionode;

            if (!origin_audionode || !dest_audionode) continue;

            if (connect) {
                LGAudio.connect(origin_audionode, dest_audionode);
            } else {
                LGAudio.disconnect(origin_audionode, dest_audionode);
            }
        }
    }

    static loadSound(url: string): Promise<AudioBuffer> {
        return new Promise((resolve, reject) => {
            if (LGAudio.cached_audios[url]) {
                resolve(LGAudio.cached_audios[url]);
                return;
            }

            fetch(url)
                .then(response => response.arrayBuffer())
                .then(data => {
                    const context = LGAudio.getAudioContext();
                    if (!context) {
                        reject(new Error("No audio context available"));
                        return;
                    }

                    context.decodeAudioData(
                        data,
                        buffer => {
                            LGAudio.cached_audios[url] = buffer;
                            resolve(buffer);
                        },
                        error => {
                            console.error("Error decoding audio", error);
                            reject(error);
                        }
                    );
                })
                .catch(reject);
        });
    }

    static createAudioNodeWrapper(nodeClass: any): void {
        if (!nodeClass.prototype.onPropertyChanged) {
            nodeClass.prototype.onPropertyChanged = function(this: any, name: string, value: any) {
                if (!this.audionode) return;

                if (this.audionode[name] === undefined) return;

                if (this.audionode[name].value !== undefined) {
                    this.audionode[name].value = value;
                } else {
                    this.audionode[name] = value;
                }
            };
        }

        if (!nodeClass.prototype.onConnectionsChange) {
            nodeClass.prototype.onConnectionsChange = function(this: any) {
                if (!this.audionode) return;

                if (this.graph && this.graph.status === LiteGraph.STATUS_RUNNING) {
                    LGAudio.changeAllAudiosConnections(this, true);
                }
            };
        }
    }
}

class LGAudioSource extends LiteGraph.LGraphNode {
    properties: {
        src: string;
        gain: number;
        loop: boolean;
        autoplay: boolean;
    };
    audionode: GainNode | null;
    audiobuffer: AudioBuffer | null;
    audiosource: AudioBufferSourceNode | null;
    loading_audio: boolean;

    constructor() {
        super();
        this.properties = {
            src: "",
            gain: 0.5,
            loop: true,
            autoplay: true
        };

        this.audionode = null;
        this.audiobuffer = null;
        this.audiosource = null;
        this.loading_audio = false;

        this.addInput("gain", "number");
        this.addInput("play", LiteGraph.ACTION);
        this.addInput("stop", LiteGraph.ACTION);
        this.addOutput("out", "audio");
    }

    onAdded(graph: any): void {
        if (graph.status === LiteGraph.STATUS_RUNNING) {
            this.onStart();
        }
    }

    onStart(): void {
        if (!this.audionode) {
            const context = LGAudio.getAudioContext();
            if (!context) return;
            this.audionode = context.createGain();
            this.audionode.gain.value = this.properties.gain;
        }
    }

    onStop(): void {
        this.stopSound();
    }

    onPause(): void {
        this.pauseSound();
    }

    onUnpause(): void {
        this.unpauseSound();
    }

    stopSound(): void {
        if (this.audiosource) {
            this.audiosource.stop();
            this.audiosource = null;
        }
    }

    pauseSound(): void {
        if (this.audionode) {
            this.audionode.disconnect();
        }
    }

    unpauseSound(): void {
        if (this.audionode && this.audiosource) {
            this.audionode.connect(this.audiosource);
        }
    }

    onExecute(): void {
        if (!this.audionode) return;

        const gain = this.getInputData(0);
        if (gain !== undefined) {
            this.audionode.gain.value = gain;
        }

        if (this.inputs[0].link !== null) {
            this.audionode.gain.value = this.getInputData(0);
        }

        if (this.audiobuffer && !this.audiosource && this.properties.autoplay) {
            this.playBuffer(this.audiobuffer);
        }
    }

    onAction(event: string): void {
        if (event === "play") {
            this.playBuffer();
        } else if (event === "stop") {
            this.stopSound();
        }
    }

    playBuffer(buffer?: AudioBuffer): void {
        if (!buffer && !this.audiobuffer) return;

        const context = LGAudio.getAudioContext();
        if (!context) return;

        this.stopSound();

        this.audiosource = context.createBufferSource();
        this.audiosource.buffer = buffer || this.audiobuffer;
        this.audiosource.loop = this.properties.loop;
        this.audiosource.connect(this.audionode);
        this.audiosource.start();
    }

    onPropertyChanged(name: string, value: any): void {
        if (name === "src") {
            this.loadSound(value);
        }
    }

    loadSound(url: string): void {
        if (!url) return;

        this.loading_audio = true;

        LGAudio.loadSound(url)
            .then(buffer => {
                this.audiobuffer = buffer;
                this.loading_audio = false;
                if (this.properties.autoplay) {
                    this.playBuffer();
                }
            })
            .catch(err => {
                console.error("Error loading audio:", err);
                this.loading_audio = false;
            });
    }
}

LGAudioSource.title = "Source";
LGAudioSource.desc = "Audio source";
LiteGraph.registerNodeType("audio/source", LGAudioSource);

// More audio nodes will be added here...
