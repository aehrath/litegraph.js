import { LGraphNode, IWidget, LiteGraph, SerializedLGraphNode } from "../core/LiteGraph.js";

// MIDI Constants
const MIDI_COLOR = "#243";

interface MIDIEventData {
    data: Uint32Array;
    object_class?: string;
}

interface MIDICommands {
    [key: number]: string;
}

class MIDIEvent {
    static NOTEOFF = 0x80;
    static NOTEON = 0x90;
    static KEYPRESSURE = 0xa0;
    static CONTROLLERCHANGE = 0xb0;
    static PROGRAMCHANGE = 0xc0;
    static CHANNELPRESSURE = 0xd0;
    static PITCHBEND = 0xe0;
    static TIMETICK = 0xf8;

    static notes: string[] = [
        "A", "A#", "B", "C", "C#", "D",
        "D#", "E", "F", "F#", "G", "G#"
    ];

    static note_to_index: { [key: string]: number } = {
        "A": 0, "A#": 1, "B": 2, "C": 3,
        "C#": 4, "D": 5, "D#": 6, "E": 7,
        "F": 8, "F#": 9, "G": 10, "G#": 11
    };

    static commands: MIDICommands = {
        0x80: "note off",
        0x90: "note on",
        0xa0: "key pressure",
        0xb0: "controller change",
        0xc0: "program change",
        0xd0: "channel pressure",
        0xe0: "pitch bend",
        0xf0: "system",
        0xf2: "Song pos",
        0xf3: "Song select",
        0xf6: "Tune request",
        0xf8: "time tick",
        0xfa: "Start Song",
        0xfb: "Continue Song",
        0xfc: "Stop Song",
        0xfe: "Sensing",
        0xff: "Reset"
    };

    static commands_short: MIDICommands = {
        0x80: "NOTEOFF",
        0x90: "NOTEOFF",
        0xa0: "KEYP",
        0xb0: "CC",
        0xc0: "PC",
        0xd0: "CP",
        0xe0: "PB",
        0xf0: "SYS",
        0xf2: "POS",
        0xf3: "SELECT",
        0xf6: "TUNEREQ",
        0xf8: "TT",
        0xfa: "START",
        0xfb: "CONTINUE",
        0xfc: "STOP",
        0xfe: "SENS",
        0xff: "RESET"
    };

    static commands_reversed: { [key: string]: number } = {};

    channel: number;
    cmd: number;
    status: number;
    cmd_str: string;
    data: Uint32Array;

    constructor(data?: Uint32Array | MIDIEventData) {
        this.channel = 0;
        this.cmd = 0;
        this.data = new Uint32Array(3);

        if (data) {
            this.setup(data);
        }
    }

    fromJSON(o: MIDIEventData): void {
        this.setup(o.data);
    }

    setup(data: Uint32Array | MIDIEventData): void {
        const raw_data = data instanceof Uint32Array ? data : data.data;
        this.data.set(raw_data);

        const midiStatus = raw_data[0];
        this.status = midiStatus;

        const midiCommand = midiStatus & 0xf0;

        if (midiStatus >= 0xf0) {
            this.cmd = midiStatus;
        } else {
            this.cmd = midiCommand;
        }

        if (this.cmd == MIDIEvent.NOTEON && this.velocity === 0) {
            this.cmd = MIDIEvent.NOTEOFF;
        }

        this.cmd_str = MIDIEvent.commands[this.cmd] || "";

        if (midiCommand >= MIDIEvent.NOTEON || midiCommand <= MIDIEvent.NOTEOFF) {
            this.channel = midiStatus & 0x0f;
        }
    }

    get velocity(): number {
        if (this.cmd == MIDIEvent.NOTEON) {
            return this.data[2];
        }
        return -1;
    }

    set velocity(v: number) {
        this.data[2] = v;
    }

    get note(): string {
        if (this.cmd != MIDIEvent.NOTEON) {
            return "";
        }
        return MIDIEvent.toNoteString(this.data[1], true);
    }

    get octave(): number {
        if (this.cmd != MIDIEvent.NOTEON) {
            return -1;
        }
        const octave = this.data[1] - 24;
        return Math.floor(octave / 12 + 1);
    }

    getPitch(): number {
        return Math.pow(2, (this.data[1] - 69) / 12) * 440;
    }

    static computePitch(note: number): number {
        return Math.pow(2, (note - 69) / 12) * 440;
    }

    getCC(): number {
        return this.data[1];
    }

    getCCValue(): number {
        return this.data[2];
    }

    getPitchBend(): number {
        return this.data[1] + (this.data[2] << 7) - 8192;
    }

    static computePitchBend(v1: number, v2: number): number {
        return v1 + (v2 << 7) - 8192;
    }

    setCommandFromString(str: string): void {
        this.cmd = MIDIEvent.computeCommandFromString(str);
    }

    static computeCommandFromString(str: string | number): number {
        if (!str) {
            return 0;
        }

        if (typeof str === "number") {
            return str;
        }

        str = str.toUpperCase();
        switch (str) {
            case "NOTE ON":
            case "NOTEON":
                return MIDIEvent.NOTEON;
            case "NOTE OFF":
            case "NOTEOFF":
                return MIDIEvent.NOTEOFF;
            case "KEY PRESSURE":
            case "KEYPRESSURE":
                return MIDIEvent.KEYPRESSURE;
            case "CONTROLLER CHANGE":
            case "CONTROLLERCHANGE":
            case "CC":
                return MIDIEvent.CONTROLLERCHANGE;
            case "PROGRAM CHANGE":
            case "PROGRAMCHANGE":
            case "PC":
                return MIDIEvent.PROGRAMCHANGE;
            case "CHANNEL PRESSURE":
            case "CHANNELPRESSURE":
                return MIDIEvent.CHANNELPRESSURE;
            case "PITCH BEND":
            case "PITCHBEND":
                return MIDIEvent.PITCHBEND;
            case "TIME TICK":
            case "TIMETICK":
                return MIDIEvent.TIMETICK;
            default:
                return Number(str);
        }
    }

    static toNoteString(d: number, skip_octave?: boolean): string {
        d = Math.round(d);
        let note = d - 21;
        const octave = Math.floor((d - 24) / 12 + 1);
        note = note % 12;
        if (note < 0) {
            note = 12 + note;
        }
        return MIDIEvent.notes[note] + (skip_octave ? "" : octave);
    }

    static NoteStringToPitch(str: string): number | null {
        str = str.toUpperCase();
        let note = str[0];
        let octave = 4;

        if (str[1] === "#") {
            note += "#";
            if (str.length > 2) {
                octave = Number(str[2]);
            }
        } else if (str.length > 1) {
            octave = Number(str[1]);
        }

        const pitch = MIDIEvent.note_to_index[note];
        if (pitch == null) {
            return null;
        }
        return (octave - 1) * 12 + pitch + 21;
    }

    toString(): string {
        let str = `${this.channel}. `;
        switch (this.cmd) {
            case MIDIEvent.NOTEON:
                str += `NOTEON ${MIDIEvent.toNoteString(this.data[1])}`;
                break;
            case MIDIEvent.NOTEOFF:
                str += `NOTEOFF ${MIDIEvent.toNoteString(this.data[1])}`;
                break;
            case MIDIEvent.CONTROLLERCHANGE:
                str += `CC ${this.data[1]} ${this.data[2]}`;
                break;
            case MIDIEvent.PROGRAMCHANGE:
                str += `PC ${this.data[1]}`;
                break;
            case MIDIEvent.PITCHBEND:
                str += `PITCHBEND ${this.getPitchBend()}`;
                break;
            case MIDIEvent.KEYPRESSURE:
                str += `KEYPRESS ${this.data[1]}`;
                break;
        }
        return str;
    }

    toHexString(): string {
        return Array.from(this.data)
            .map(v => v.toString(16))
            .join(" ");
    }

    toJSON(): MIDIEventData {
        return {
            data: new Uint32Array([this.data[0], this.data[1], this.data[2]]),
            object_class: "MIDIEvent"
        };
    }
}

// Initialize the commands_reversed object
Object.entries(MIDIEvent.commands).forEach(([key, value]) => {
    MIDIEvent.commands_reversed[value] = Number(key);
});

// Export for use in LiteGraph
if (typeof window !== 'undefined') {
    (window as any).LiteGraph.MIDIEvent = MIDIEvent;
}
