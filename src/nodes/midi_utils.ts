import { LGraphNode, IWidget, LiteGraph, SerializedLGraphNode } from "../core/LiteGraph.js";
import { MIDIEvent } from "./midi.js";

const MIDI_COLOR = "#243";

interface LGMIDIGeneratorNode extends LGraphNode {
    properties: {
        note: number;
        velocity: number;
        channel: number;
        duration: number;
        octave: number;
    };
    current_midi?: MIDIEvent;
    timer?: number;
}

class LGMIDIGenerator implements LGMIDIGeneratorNode {
    static title = "MIDI Generator";
    static desc = "Generates MIDI events";
    static color = MIDI_COLOR;

    properties: {
        note: number;
        velocity: number;
        channel: number;
        duration: number;
        octave: number;
    };
    current_midi?: MIDIEvent;
    timer?: number;

    constructor() {
        this.addInput("generate", LiteGraph.ACTION);
        this.addInput("note", "number");
        this.addInput("velocity", "number");
        this.addInput("duration", "number");
        this.addOutput("on_midi", LiteGraph.EVENT);
        this.addOutput("midi", "midi");

        this.properties = {
            note: 48,        // C3
            velocity: 100,   // Default velocity
            channel: 0,      // MIDI channel 1
            duration: 100,   // Duration in ms
            octave: 3        // Default octave
        };

        const that = this;
        this.addWidget("number", "Note", this.properties.note, (v) => {
            that.properties.note = Math.clamp(v, 0, 127);
        }, { min: 0, max: 127, step: 1 });
        this.addWidget("number", "Velocity", this.properties.velocity, (v) => {
            that.properties.velocity = Math.clamp(v, 0, 127);
        }, { min: 0, max: 127, step: 1 });
        this.addWidget("number", "Channel", this.properties.channel, (v) => {
            that.properties.channel = Math.clamp(v, 0, 15);
        }, { min: 0, max: 15, step: 1 });
        this.addWidget("number", "Duration (ms)", this.properties.duration, (v) => {
            that.properties.duration = Math.max(v, 1);
        }, { min: 1, max: 10000, step: 1 });
    }

    onAction(): void {
        const note = Math.floor(this.getInputData(1) ?? this.properties.note);
        const velocity = Math.floor(this.getInputData(2) ?? this.properties.velocity);
        const duration = this.getInputData(3) ?? this.properties.duration;

        // Create Note On event
        const midi_on = new MIDIEvent();
        midi_on.setup([MIDIEvent.NOTEON, note, velocity]);
        midi_on.channel = this.properties.channel;

        this.current_midi = midi_on;
        this.trigger("on_midi", midi_on);
        this.setOutputData(1, midi_on);

        const that = this;
        if (this.timer) {
            clearTimeout(this.timer);
        }

        // Schedule Note Off event
        this.timer = setTimeout(() => {
            const midi_off = new MIDIEvent();
            midi_off.setup([MIDIEvent.NOTEOFF, note, 0]);
            midi_off.channel = that.properties.channel;

            that.current_midi = midi_off;
            that.trigger("on_midi", midi_off);
            that.setOutputData(1, midi_off);
        }, duration);
    }

    onExecute(): void {
        // Output the current MIDI event if any
        if (this.current_midi) {
            this.setOutputData(1, this.current_midi);
        }
    }
}

interface LGMIDITransposeNode extends LGraphNode {
    properties: {
        semitones: number;
    };
}

class LGMIDITranspose implements LGMIDITransposeNode {
    static title = "MIDI Transpose";
    static desc = "Transposes MIDI notes";
    static color = MIDI_COLOR;

    properties: {
        semitones: number;
    };

    constructor() {
        this.addInput("in", LiteGraph.EVENT);
        this.addOutput("out", LiteGraph.EVENT);

        this.properties = {
            semitones: 0
        };

        const that = this;
        this.addWidget("number", "Semitones", this.properties.semitones, (v) => {
            that.properties.semitones = Math.floor(v);
        }, { step: 1 });
    }

    onAction(event: string, midi_event: MIDIEvent): void {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        // Only transpose note events
        if (midi_event.cmd !== MIDIEvent.NOTEON && midi_event.cmd !== MIDIEvent.NOTEOFF) {
            this.trigger("out", midi_event);
            return;
        }

        const transposed_event = midi_event.clone();
        const new_note = Math.clamp(
            transposed_event.data[1] + this.properties.semitones,
            0,
            127
        );
        transposed_event.data[1] = new_note;

        this.trigger("out", transposed_event);
    }
}

interface LGMIDIQuantizeNode extends LGraphNode {
    properties: {
        step: number;
        scale: string;
    };
    scale_notes: number[];
}

class LGMIDIQuantize implements LGMIDIQuantizeNode {
    static title = "MIDI Quantize";
    static desc = "Quantizes MIDI notes to a scale";
    static color = MIDI_COLOR;

    static SCALES: { [key: string]: number[] } = {
        "chromatic": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        "major": [0, 2, 4, 5, 7, 9, 11],
        "minor": [0, 2, 3, 5, 7, 8, 10],
        "pentatonic": [0, 2, 4, 7, 9],
        "blues": [0, 3, 5, 6, 7, 10]
    };

    properties: {
        step: number;
        scale: string;
    };
    scale_notes: number[];

    constructor() {
        this.addInput("in", LiteGraph.EVENT);
        this.addOutput("out", LiteGraph.EVENT);

        this.properties = {
            step: 1,
            scale: "chromatic"
        };
        this.scale_notes = LGMIDIQuantize.SCALES[this.properties.scale];

        const that = this;
        this.addWidget("combo", "Scale", this.properties.scale, (v) => {
            that.properties.scale = v;
            that.scale_notes = LGMIDIQuantize.SCALES[v];
        }, { values: Object.keys(LGMIDIQuantize.SCALES) });
    }

    quantizeNote(note: number): number {
        if (!this.scale_notes || this.scale_notes.length === 0) {
            return note;
        }

        const octave = Math.floor(note / 12);
        const note_in_octave = note % 12;

        // Find the closest note in the scale
        let closest_note = this.scale_notes[0];
        let min_distance = Math.abs(note_in_octave - this.scale_notes[0]);

        for (let i = 1; i < this.scale_notes.length; i++) {
            const distance = Math.abs(note_in_octave - this.scale_notes[i]);
            if (distance < min_distance) {
                min_distance = distance;
                closest_note = this.scale_notes[i];
            }
        }

        return (octave * 12) + closest_note;
    }

    onAction(event: string, midi_event: MIDIEvent): void {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        // Only quantize note events
        if (midi_event.cmd !== MIDIEvent.NOTEON && midi_event.cmd !== MIDIEvent.NOTEOFF) {
            this.trigger("out", midi_event);
            return;
        }

        const quantized_event = midi_event.clone();
        const new_note = this.quantizeNote(quantized_event.data[1]);
        quantized_event.data[1] = new_note;

        this.trigger("out", quantized_event);
    }
}

interface LGMIDIChordNode extends LGraphNode {
    properties: {
        chord_type: string;
        base_octave: number;
    };
}

class LGMIDIChord implements LGMIDIChordNode {
    static title = "MIDI Chord";
    static desc = "Generates MIDI chord from input note";
    static color = MIDI_COLOR;

    static CHORD_TYPES: { [key: string]: number[] } = {
        "major": [0, 4, 7],
        "minor": [0, 3, 7],
        "diminished": [0, 3, 6],
        "augmented": [0, 4, 8],
        "major7": [0, 4, 7, 11],
        "minor7": [0, 3, 7, 10],
        "dominant7": [0, 4, 7, 10]
    };

    properties: {
        chord_type: string;
        base_octave: number;
    };

    constructor() {
        this.addInput("in", LiteGraph.EVENT);
        this.addOutput("out", LiteGraph.EVENT);

        this.properties = {
            chord_type: "major",
            base_octave: 3
        };

        const that = this;
        this.addWidget("combo", "Chord Type", this.properties.chord_type, (v) => {
            that.properties.chord_type = v;
        }, { values: Object.keys(LGMIDIChord.CHORD_TYPES) });
    }

    onAction(event: string, midi_event: MIDIEvent): void {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        // Only process note on/off events
        if (midi_event.cmd !== MIDIEvent.NOTEON && midi_event.cmd !== MIDIEvent.NOTEOFF) {
            this.trigger("out", midi_event);
            return;
        }

        const chord_intervals = LGMIDIChord.CHORD_TYPES[this.properties.chord_type];
        if (!chord_intervals) {
            return;
        }

        const base_note = midi_event.data[1];
        const velocity = midi_event.data[2];

        // Generate and trigger a MIDI event for each note in the chord
        for (const interval of chord_intervals) {
            const chord_note = Math.clamp(base_note + interval, 0, 127);
            const chord_event = midi_event.clone();
            chord_event.data[1] = chord_note;
            this.trigger("out", chord_event);
        }
    }
}

// Register node types
if (typeof window !== 'undefined') {
    const LG = window.LiteGraph;
    LG.registerNodeType("midi/generator", LGMIDIGenerator);
    LG.registerNodeType("midi/transpose", LGMIDITranspose);
    LG.registerNodeType("midi/quantize", LGMIDIQuantize);
    LG.registerNodeType("midi/chord", LGMIDIChord);
}
