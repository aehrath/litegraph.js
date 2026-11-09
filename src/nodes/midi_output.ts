import { LGraphNode, IWidget, LiteGraph, SerializedLGraphNode } from "../core/LiteGraph.js";
import { MIDIEvent } from "./midi.js";
import { MIDIInterface } from "./midi_nodes.js";

const MIDI_COLOR = "#243";

interface LGMIDIOutNode extends LGraphNode {
    properties: {
        port: number;
    };
    midi?: MIDIInterface;
    boxcolor?: string;
}

class LGMIDIOut implements LGMIDIOutNode {
    static MIDIInterface = MIDIInterface;
    static title = "MIDI Output";
    static desc = "Sends MIDI to output channel";
    static color = MIDI_COLOR;
    static default_ports = { 0: "unknown" };

    properties: {
        port: number;
    };
    midi?: MIDIInterface;
    boxcolor?: string;

    constructor() {
        this.addInput("send", LiteGraph.ACTION);
        this.addInput("midi", "midi");
        this.properties = { port: 0 };

        const that = this;
        new MIDIInterface(function(midi: MIDIInterface) {
            that.midi = midi;
            if (that.properties.port && midi.output_ports_info.length > that.properties.port) {
                const port_info = midi.output_ports_info[that.properties.port];
                that.boxcolor = "#AFA";
            }
        });
    }

    onGetPropertyInfo(name: string): { type: string; values: { [key: string]: string } } {
        if (!this.midi) {
            return { type: "number", values: LGMIDIOut.default_ports };
        }

        const values: { [key: string]: string } = {};
        for (let i = 0; i < this.midi.output_ports_info.length; ++i) {
            const port_info = this.midi.output_ports_info[i];
            values[String(i)] = port_info.name + " version:" + port_info.version;
        }
        return { type: "number", values: values };
    }

    onAction(event: string, midi_event: MIDIEvent): void {
        if (!this.midi || !midi_event) {
            return;
        }

        const output_port = this.midi.output_ports?.get(this.midi.output_ports_info[this.properties.port]?.id);
        if (!output_port) {
            return;
        }

        this.midi.sendMIDI(output_port, Array.from(midi_event.data));
        this.boxcolor = "#AFA";
    }

    onExecute(): void {
        const midi_event = this.getInputData(1);
        if (!midi_event) {
            return;
        }
        this.onAction("", midi_event);
    }

    onGetInputs(): [string, string][] {
        return [["midi", "midi"]];
    }

    onGetOutputs(): [string, string][] {
        return [];
    }
}

interface LGMIDIShowNode extends LGraphNode {
    last_midi?: MIDIEvent;
    boxcolor?: string;
}

class LGMIDIShow implements LGMIDIShowNode {
    static title = "MIDI Show";
    static desc = "Shows MIDI in the graph";
    static color = MIDI_COLOR;

    last_midi?: MIDIEvent;
    boxcolor?: string;
    size: [number, number] = [200, 40];

    constructor() {
        this.addInput("on_midi", LiteGraph.EVENT);
    }

    getTitle(): string {
        if (!this.last_midi) {
            return "No MIDI";
        }
        return this.last_midi.toString();
    }

    onAction(event: string, midi_event: MIDIEvent): void {
        this.last_midi = midi_event;
        this.boxcolor = "#AFA";
        setTimeout(() => {
            this.boxcolor = LGMIDIShow.color;
        }, 100);
    }

    onDrawForeground(ctx: CanvasRenderingContext2D): void {
        if (!this.last_midi) {
            return;
        }

        ctx.font = "12px Arial";
        ctx.fillStyle = "#AAA";
        ctx.fillText(this.last_midi.toString(), 2, this.size[1] * 0.8);
    }

    onGetInputs(): [string, string][] {
        return [["on_midi", LiteGraph.EVENT]];
    }

    onGetOutputs(): [string, string][] {
        return [];
    }
}

interface LGMIDIFilterNode extends LGraphNode {
    properties: {
        channel: number;
        cmd: string;
    };
}

class LGMIDIFilter implements LGMIDIFilterNode {
    static title = "MIDI Filter";
    static desc = "Filters MIDI messages";
    static color = MIDI_COLOR;

    properties: {
        channel: number;
        cmd: string;
    };

    constructor() {
        this.properties = {
            channel: -1,
            cmd: "all"
        };

        this.addInput("in", LiteGraph.EVENT);
        this.addOutput("on_midi", LiteGraph.EVENT);
        this.addOutput("midi", "midi");

        const that = this;
        this.addWidget("combo", "Command", this.properties.cmd, function(v) {
            that.properties.cmd = v;
        }, {
            values: [
                "all",
                "noteOn",
                "noteOff",
                "keyPressure",
                "controllerChange",
                "programChange",
                "channelPressure",
                "pitchBend"
            ]
        });
    }

    onPropertyChanged(name: string, value: any): void {
        if (name == "cmd") {
            this.properties.cmd = value;
        }
    }

    onAction(event: string, midi_event: MIDIEvent): void {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        if (
            this.properties.channel != -1 &&
            midi_event.channel != this.properties.channel
        ) {
            return;
        }

        if (this.properties.cmd == "all") {
            this.trigger("on_midi", midi_event);
            this.setOutputData(1, midi_event);
            return;
        }

        if (this.properties.cmd == "noteOn" && midi_event.cmd == MIDIEvent.NOTEON) {
            this.trigger("on_midi", midi_event);
            this.setOutputData(1, midi_event);
        } else if (
            this.properties.cmd == "noteOff" &&
            midi_event.cmd == MIDIEvent.NOTEOFF
        ) {
            this.trigger("on_midi", midi_event);
            this.setOutputData(1, midi_event);
        } else if (
            this.properties.cmd == "keyPressure" &&
            midi_event.cmd == MIDIEvent.KEYPRESSURE
        ) {
            this.trigger("on_midi", midi_event);
            this.setOutputData(1, midi_event);
        } else if (
            this.properties.cmd == "controllerChange" &&
            midi_event.cmd == MIDIEvent.CONTROLLERCHANGE
        ) {
            this.trigger("on_midi", midi_event);
            this.setOutputData(1, midi_event);
        } else if (
            this.properties.cmd == "programChange" &&
            midi_event.cmd == MIDIEvent.PROGRAMCHANGE
        ) {
            this.trigger("on_midi", midi_event);
            this.setOutputData(1, midi_event);
        } else if (
            this.properties.cmd == "channelPressure" &&
            midi_event.cmd == MIDIEvent.CHANNELPRESSURE
        ) {
            this.trigger("on_midi", midi_event);
            this.setOutputData(1, midi_event);
        } else if (
            this.properties.cmd == "pitchBend" &&
            midi_event.cmd == MIDIEvent.PITCHBEND
        ) {
            this.trigger("on_midi", midi_event);
            this.setOutputData(1, midi_event);
        }
    }
}

// Register node types
if (typeof window !== 'undefined') {
    const LG = window.LiteGraph;
    LG.registerNodeType("midi/output", LGMIDIOut);
    LG.registerNodeType("midi/show", LGMIDIShow);
    LG.registerNodeType("midi/filter", LGMIDIFilter);
}
