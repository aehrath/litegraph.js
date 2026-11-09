import { LGraphNode, IWidget, LiteGraph, SerializedLGraphNode } from "../core/LiteGraph.js";
import { MIDIEvent } from "./midi.js";

const MIDI_COLOR = "#243";

interface LGMIDIArpeggiatorNode extends LGraphNode {
    properties: {
        pattern: string;
        rate: number;
        octaves: number;
        mode: string;
    };
    current_notes: Set<number>;
    current_step: number;
    last_time: number;
}

class LGMIDIArpeggiator implements LGMIDIArpeggiatorNode {
    static title = "MIDI Arpeggiator";
    static desc = "Creates arpeggios from held notes";
    static color = MIDI_COLOR;

    static PATTERNS: { [key: string]: string } = {
        "up": "up",
        "down": "down",
        "updown": "updown",
        "downup": "downup",
        "random": "random"
    };

    static MODES: { [key: string]: string } = {
        "single": "single",
        "latch": "latch",
        "reset": "reset"
    };

    properties: {
        pattern: string;
        rate: number;
        octaves: number;
        mode: string;
    };
    current_notes: Set<number>;
    current_step: number;
    last_time: number;

    constructor() {
        this.addInput("in", LiteGraph.EVENT);
        this.addInput("clock", LiteGraph.EVENT);
        this.addInput("reset", LiteGraph.ACTION);
        this.addOutput("out", LiteGraph.EVENT);

        this.properties = {
            pattern: "up",
            rate: 8,      // Steps per beat
            octaves: 1,   // Number of octaves to span
            mode: "single"
        };

        this.current_notes = new Set();
        this.current_step = 0;
        this.last_time = 0;

        const that = this;
        this.addWidget("combo", "Pattern", this.properties.pattern, (v) => {
            that.properties.pattern = v;
        }, { values: Object.keys(LGMIDIArpeggiator.PATTERNS) });

        this.addWidget("number", "Rate", this.properties.rate, (v) => {
            that.properties.rate = Math.max(1, Math.floor(v));
        }, { min: 1, max: 32, step: 1 });

        this.addWidget("number", "Octaves", this.properties.octaves, (v) => {
            that.properties.octaves = Math.max(1, Math.floor(v));
        }, { min: 1, max: 4, step: 1 });

        this.addWidget("combo", "Mode", this.properties.mode, (v) => {
            that.properties.mode = v;
        }, { values: Object.keys(LGMIDIArpeggiator.MODES) });
    }

    getArpeggioNotes(): number[] {
        const notes = Array.from(this.current_notes).sort((a, b) => a - b);
        if (notes.length === 0) return [];

        let arpeggio: number[] = [];
        for (let oct = 0; oct < this.properties.octaves; oct++) {
            const octave_notes = notes.map(n => n + (oct * 12));
            switch (this.properties.pattern) {
                case "up":
                    arpeggio = arpeggio.concat(octave_notes);
                    break;
                case "down":
                    arpeggio = arpeggio.concat(octave_notes.reverse());
                    break;
                case "updown":
                    if (oct === this.properties.octaves - 1) {
                        arpeggio = arpeggio.concat(octave_notes, octave_notes.slice(1, -1).reverse());
                    } else {
                        arpeggio = arpeggio.concat(octave_notes);
                    }
                    break;
                case "downup":
                    if (oct === this.properties.octaves - 1) {
                        arpeggio = arpeggio.concat(octave_notes.reverse(), octave_notes.slice(1, -1));
                    } else {
                        arpeggio = arpeggio.concat(octave_notes.reverse());
                    }
                    break;
                case "random":
                    arpeggio = arpeggio.concat(octave_notes);
                    break;
            }
        }

        if (this.properties.pattern === "random") {
            // Fisher-Yates shuffle
            for (let i = arpeggio.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arpeggio[i], arpeggio[j]] = [arpeggio[j], arpeggio[i]];
            }
        }

        return arpeggio;
    }

    onAction(event: string, midi_event: MIDIEvent): void {
        if (event === "reset") {
            this.current_step = 0;
            return;
        }

        if (event === "clock") {
            this.processArpeggio();
            return;
        }

        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        if (midi_event.cmd === MIDIEvent.NOTEON) {
            this.current_notes.add(midi_event.data[1]);
            if (this.properties.mode === "reset") {
                this.current_step = 0;
            }
        } else if (midi_event.cmd === MIDIEvent.NOTEOFF) {
            if (this.properties.mode !== "latch") {
                this.current_notes.delete(midi_event.data[1]);
            }
        }
    }

    processArpeggio(): void {
        const arpeggio = this.getArpeggioNotes();
        if (arpeggio.length === 0) return;

        // Send note-off for previous note
        if (this.current_step > 0) {
            const prev_note = arpeggio[(this.current_step - 1) % arpeggio.length];
            const note_off = new MIDIEvent();
            note_off.setup([MIDIEvent.NOTEOFF, prev_note, 0]);
            this.trigger("out", note_off);
        }

        // Send note-on for current note
        const current_note = arpeggio[this.current_step % arpeggio.length];
        const note_on = new MIDIEvent();
        note_on.setup([MIDIEvent.NOTEON, current_note, 100]);
        this.trigger("out", note_on);

        this.current_step = (this.current_step + 1) % arpeggio.length;
    }
}

interface LGMIDIVelocityProcessorNode extends LGraphNode {
    properties: {
        mode: string;
        min_velocity: number;
        max_velocity: number;
        curve: number;
    };
}

class LGMIDIVelocityProcessor implements LGMIDIVelocityProcessorNode {
    static title = "MIDI Velocity Processor";
    static desc = "Processes MIDI note velocities";
    static color = MIDI_COLOR;

    static MODES: { [key: string]: string } = {
        "fixed": "fixed",
        "scale": "scale",
        "random": "random",
        "curve": "curve"
    };

    properties: {
        mode: string;
        min_velocity: number;
        max_velocity: number;
        curve: number;
    };

    constructor() {
        this.addInput("in", LiteGraph.EVENT);
        this.addOutput("out", LiteGraph.EVENT);

        this.properties = {
            mode: "scale",
            min_velocity: 0,
            max_velocity: 127,
            curve: 0        // -1 to 1, negative = logarithmic, positive = exponential
        };

        const that = this;
        this.addWidget("combo", "Mode", this.properties.mode, (v) => {
            that.properties.mode = v;
        }, { values: Object.keys(LGMIDIVelocityProcessor.MODES) });

        this.addWidget("number", "Min Velocity", this.properties.min_velocity, (v) => {
            that.properties.min_velocity = Math.clamp(v, 0, 127);
        }, { min: 0, max: 127, step: 1 });

        this.addWidget("number", "Max Velocity", this.properties.max_velocity, (v) => {
            that.properties.max_velocity = Math.clamp(v, 0, 127);
        }, { min: 0, max: 127, step: 1 });

        this.addWidget("number", "Curve", this.properties.curve, (v) => {
            that.properties.curve = Math.clamp(v, -1, 1);
        }, { min: -1, max: 1, step: 0.1 });
    }

    processVelocity(velocity: number): number {
        switch (this.properties.mode) {
            case "fixed":
                return this.properties.max_velocity;
            
            case "scale":
                return Math.lerp(
                    this.properties.min_velocity,
                    this.properties.max_velocity,
                    velocity / 127
                );
            
            case "random":
                return Math.floor(Math.random() * 
                    (this.properties.max_velocity - this.properties.min_velocity + 1)) +
                    this.properties.min_velocity;
            
            case "curve":
                let t = velocity / 127;
                if (this.properties.curve !== 0) {
                    // Apply curve using power function
                    const power = Math.exp(Math.abs(this.properties.curve) * 3);
                    t = this.properties.curve > 0 ? 
                        Math.pow(t, power) : 
                        1 - Math.pow(1 - t, power);
                }
                return Math.floor(Math.lerp(
                    this.properties.min_velocity,
                    this.properties.max_velocity,
                    t
                ));
            
            default:
                return velocity;
        }
    }

    onAction(event: string, midi_event: MIDIEvent): void {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        if (midi_event.cmd === MIDIEvent.NOTEON) {
            const processed_event = midi_event.clone();
            processed_event.data[2] = this.processVelocity(midi_event.data[2]);
            this.trigger("out", processed_event);
        } else {
            this.trigger("out", midi_event);
        }
    }
}

interface LGMIDIClockNode extends LGraphNode {
    properties: {
        bpm: number;
        ppq: number;
    };
    current_tick: number;
    last_time: number;
    is_playing: boolean;
}

class LGMIDIClock implements LGMIDIClockNode {
    static title = "MIDI Clock";
    static desc = "Generates MIDI clock events";
    static color = MIDI_COLOR;

    properties: {
        bpm: number;
        ppq: number;
    };
    current_tick: number;
    last_time: number;
    is_playing: boolean;

    constructor() {
        this.addInput("play", LiteGraph.ACTION);
        this.addInput("stop", LiteGraph.ACTION);
        this.addInput("reset", LiteGraph.ACTION);
        this.addOutput("tick", LiteGraph.EVENT);
        this.addOutput("beat", LiteGraph.EVENT);
        this.addOutput("bar", LiteGraph.EVENT);

        this.properties = {
            bpm: 120,
            ppq: 24     // Pulses per quarter note (standard MIDI clock)
        };

        this.current_tick = 0;
        this.last_time = 0;
        this.is_playing = false;

        const that = this;
        this.addWidget("number", "BPM", this.properties.bpm, (v) => {
            that.properties.bpm = Math.max(20, Math.min(300, v));
        }, { min: 20, max: 300, step: 1 });
    }

    onAction(event: string): void {
        switch (event) {
            case "play":
                this.is_playing = true;
                this.last_time = Date.now();
                break;
            case "stop":
                this.is_playing = false;
                break;
            case "reset":
                this.current_tick = 0;
                break;
        }
    }

    onExecute(): void {
        if (!this.is_playing) return;

        const current_time = Date.now();
        const elapsed = current_time - this.last_time;
        const tick_interval = (60000 / this.properties.bpm) / this.properties.ppq;

        if (elapsed >= tick_interval) {
            this.last_time = current_time - (elapsed % tick_interval);
            this.current_tick++;

            // Trigger tick event
            this.trigger("tick");

            // Trigger beat event every ppq ticks
            if (this.current_tick % this.properties.ppq === 0) {
                this.trigger("beat");
            }

            // Trigger bar event every 4 beats (assuming 4/4 time signature)
            if (this.current_tick % (this.properties.ppq * 4) === 0) {
                this.trigger("bar");
            }
        }
    }
}

// Register node types
if (typeof window !== 'undefined') {
    const LG = window.LiteGraph;
    LG.registerNodeType("midi/arpeggiator", LGMIDIArpeggiator);
    LG.registerNodeType("midi/velocity", LGMIDIVelocityProcessor);
    LG.registerNodeType("midi/clock", LGMIDIClock);
}
