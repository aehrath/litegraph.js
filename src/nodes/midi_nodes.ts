import { LGraphNode, IWidget, LiteGraph, SerializedLGraphNode } from "../core/LiteGraph.js";
import { MIDIEvent } from "./midi.js";

const MIDI_COLOR = "#243";

interface MIDIState {
    note: any[];
    cc: any[];
}

interface MIDIPortInfo {
    type: string;
    id: string;
    manufacturer: string;
    name: string;
    version: string;
}

class MIDIInterface {
    static input: MIDIInput | null = null;
    static MIDIEvent = MIDIEvent;

    midi: MIDIAccess;
    error?: string;
    on_ready?: (midi: MIDIInterface) => void;
    state: MIDIState;
    input_ports: MIDIInputMap | null;
    input_ports_info: MIDIPortInfo[];
    output_ports: MIDIOutputMap | null;
    output_ports_info: MIDIPortInfo[];
    num_input_ports: number;
    num_output_ports: number;

    constructor(on_ready?: (midi: MIDIInterface) => void, on_error?: (msg: string) => void) {
        if (!navigator.requestMIDIAccess) {
            this.error = "not supported";
            if (on_error) {
                on_error("Not supported");
            } else {
                console.error("MIDI NOT SUPPORTED, enable by chrome://flags");
            }
            return;
        }

        this.on_ready = on_ready;
        this.state = {
            note: [],
            cc: []
        };

        this.input_ports = null;
        this.input_ports_info = [];
        this.output_ports = null;
        this.output_ports_info = [];

        navigator.requestMIDIAccess().then(
            this.onMIDISuccess.bind(this),
            this.onMIDIFailure.bind(this)
        );
    }

    onMIDISuccess(midiAccess: MIDIAccess): void {
        console.log("MIDI ready!", midiAccess);
        this.midi = midiAccess;
        this.updatePorts();

        if (this.on_ready) {
            this.on_ready(this);
        }
    }

    updatePorts(): void {
        this.input_ports = this.midi.inputs;
        this.input_ports_info = [];
        this.output_ports = this.midi.outputs;
        this.output_ports_info = [];

        let num = 0;
        const inputs = this.input_ports.values();
        for (let port_info = inputs.next(); !port_info.done; port_info = inputs.next()) {
            this.input_ports_info.push(port_info.value);
            console.log(
                `Input port [type:'${port_info.value.type}'] id:'${port_info.value.id}' manufacturer:'${port_info.value.manufacturer}' name:'${port_info.value.name}' version:'${port_info.value.version}'`
            );
            num++;
        }
        this.num_input_ports = num;

        num = 0;
        const outputs = this.output_ports.values();
        for (let port_info = outputs.next(); !port_info.done; port_info = outputs.next()) {
            this.output_ports_info.push(port_info.value);
            console.log(
                `Output port [type:'${port_info.value.type}'] id:'${port_info.value.id}' manufacturer:'${port_info.value.manufacturer}' name:'${port_info.value.name}' version:'${port_info.value.version}'`
            );
            num++;
        }
        this.num_output_ports = num;
    }

    onMIDIFailure(msg: string): void {
        console.error("Failed to get MIDI access -", msg);
    }

    openInputPort(port: MIDIInput, callback: (data: any) => void): void {
        if (!this.input_ports) {
            return;
        }

        if (port.onmidimessage !== null) {
            console.log("port has already an input");
        }

        port.onmidimessage = (msg: WebMidi.MIDIMessageEvent) => {
            const data = msg.data;
            const midi_event = new MIDIEvent(data);
            this.updateState(midi_event);
            if (callback) {
                callback(data, midi_event);
            }
        };
    }

    updateState(midi_event: MIDIEvent): void {
        if (midi_event.cmd == MIDIEvent.NOTEON) {
            this.state.note[midi_event.data[1]] = midi_event.data[2];
        } else if (midi_event.cmd == MIDIEvent.NOTEOFF) {
            this.state.note[midi_event.data[1]] = 0;
        } else if (midi_event.cmd == MIDIEvent.CONTROLLERCHANGE) {
            this.state.cc[midi_event.data[1]] = midi_event.data[2];
        }
    }

    sendMIDI(port: MIDIOutput, midi_data: number[]): void {
        if (!midi_data || !port) {
            return;
        }

        port.send(midi_data);
    }
}

interface LGMIDIInNode extends LGraphNode {
    properties: {
        port: number;
    };
    midi?: MIDIInterface;
    current_midi_event?: MIDIEvent;
    boxcolor?: string;
}

class LGMIDIIn implements LGMIDIInNode {
    static MIDIInterface = MIDIInterface;
    static title = "MIDI Input";
    static desc = "Reads MIDI from an input port";
    static color = MIDI_COLOR;

    properties: {
        port: number;
    };
    midi?: MIDIInterface;
    current_midi_event?: MIDIEvent;
    boxcolor?: string;
    size: [number, number] = [240, 180];

    constructor() {
        this.addInput("active", "boolean");
        this.addOutput("on_midi", LiteGraph.EVENT);
        this.addOutput("out", "midi");
        this.properties = { port: 0 };

        const that = this;
        new MIDIInterface(function(midi: MIDIInterface) {
            that.midi = midi;
            if (that.properties.port && midi.input_ports_info.length > that.properties.port) {
                const port_info = midi.input_ports_info[that.properties.port];
                that.boxcolor = "#AFA";
            }
        });
    }

    getPropertyInfo(name: string): { type: string; values: { [key: string]: string } } {
        if (!this.midi) {
            return { type: "number", values: { "0": "unknown" } };
        }

        const values: { [key: string]: string } = {};
        for (let i = 0; i < this.midi.input_ports_info.length; ++i) {
            const port_info = this.midi.input_ports_info[i];
            values[String(i)] = port_info.name + " version:" + port_info.version;
        }
        return { type: "number", values: values };
    }

    onStart(): void {
        if (!this.midi) {
            return;
        }

        const input_port = this.midi.input_ports?.get(this.midi.input_ports_info[this.properties.port]?.id);
        if (!input_port) {
            return;
        }

        this.midi.openInputPort(input_port, this.onMIDIEvent.bind(this));
    }

    onMIDIEvent(data: Uint8Array, midi_event: MIDIEvent): void {
        this.current_midi_event = midi_event;
        this.boxcolor = "#AFA";
        this.trigger("on_midi", midi_event);
        if (midi_event.cmd == MIDIEvent.NOTEON) {
            this.trigger("on_noteon", midi_event);
        } else if (midi_event.cmd == MIDIEvent.NOTEOFF) {
            this.trigger("on_noteoff", midi_event);
        } else if (midi_event.cmd == MIDIEvent.CONTROLLERCHANGE) {
            this.trigger("on_cc", midi_event);
        } else if (midi_event.cmd == MIDIEvent.PROGRAMCHANGE) {
            this.trigger("on_pc", midi_event);
        } else if (midi_event.cmd == MIDIEvent.PITCHBEND) {
            this.trigger("on_pitchbend", midi_event);
        }
    }

    onDrawBackground(ctx: CanvasRenderingContext2D): void {
        if (!this.midi) {
            return;
        }

        if (!this.current_midi_event) {
            return;
        }

        ctx.font = "12px Arial";
        ctx.fillStyle = "#AAA";
        ctx.fillText(
            this.current_midi_event.toString(),
            2,
            this.size[1] * 0.5
        );

        const note_info = "";
        if (this.current_midi_event.cmd == MIDIEvent.NOTEON) {
            ctx.fillStyle = "#AFA";
            ctx.fillText(note_info, 2, this.size[1] * 0.85);
        }
    }

    onExecute(): void {
        const active = this.getInputData(0);
        if (active === false) {
            return;
        }
        this.setOutputData(1, this.current_midi_event);
    }

    onGetOutputs(): [string, string][] {
        return [
            ["on_midi", LiteGraph.EVENT],
            ["on_noteon", LiteGraph.EVENT],
            ["on_noteoff", LiteGraph.EVENT],
            ["on_cc", LiteGraph.EVENT],
            ["on_pc", LiteGraph.EVENT],
            ["on_pitchbend", LiteGraph.EVENT]
        ];
    }
}

// Register node types
if (typeof window !== 'undefined') {
    const LG = window.LiteGraph;
    LG.registerNodeType("midi/input", LGMIDIIn);
}
