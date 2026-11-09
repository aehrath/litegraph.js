import { LGraphNode, IWidget, LiteGraph, SerializedLGraphNode } from "../core/LiteGraph.js";
import { MIDIEvent } from "./midi.js";

const MIDI_COLOR = "#243";

interface CCMapping {
    source: number;
    target: number;
    min: number;
    max: number;
    curve: number;
}

interface LGMIDICCProcessorNode extends LGraphNode {
    properties: {
        mappings: CCMapping[];
    };
}

class LGMIDICCProcessor implements LGMIDICCProcessorNode {
    static title = "MIDI CC Processor";
    static desc = "Process and remap MIDI CC messages";
    static color = MIDI_COLOR;

    properties: {
        mappings: CCMapping[];
    };

    constructor() {
        this.addInput("in", LiteGraph.EVENT);
        this.addOutput("out", LiteGraph.EVENT);

        this.properties = {
            mappings: [
                { source: 1, target: 1, min: 0, max: 127, curve: 0 }
            ]
        };

        const that = this;
        this.addWidget("button", "+", null, () => {
            that.properties.mappings.push({
                source: 1,
                target: 1,
                min: 0,
                max: 127,
                curve: 0
            });
            that.setDirtyCanvas(true);
        });
    }

    processCC(cc: number, value: number): { cc: number; value: number } | null {
        for (const mapping of this.properties.mappings) {
            if (cc === mapping.source) {
                let normalized = value / 127;
                
                // Apply curve
                if (mapping.curve !== 0) {
                    const power = Math.exp(Math.abs(mapping.curve) * 3);
                    normalized = mapping.curve > 0 ? 
                        Math.pow(normalized, power) : 
                        1 - Math.pow(1 - normalized, power);
                }

                // Apply range
                const processed = Math.floor(
                    Math.lerp(mapping.min, mapping.max, normalized)
                );

                return {
                    cc: mapping.target,
                    value: Math.clamp(processed, 0, 127)
                };
            }
        }
        return null;
    }

    onAction(event: string, midi_event: MIDIEvent): void {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        if (midi_event.cmd === MIDIEvent.CONTROLLERCHANGE) {
            const processed = this.processCC(midi_event.data[1], midi_event.data[2]);
            if (processed) {
                const new_event = midi_event.clone();
                new_event.data[1] = processed.cc;
                new_event.data[2] = processed.value;
                this.trigger("out", new_event);
            } else {
                this.trigger("out", midi_event);
            }
        } else {
            this.trigger("out", midi_event);
        }
    }

    onDrawBackground(ctx: CanvasRenderingContext2D): void {
        if (!this.properties.mappings.length) return;

        ctx.font = "12px Arial";
        ctx.fillStyle = "#AAA";
        
        let y = 40;
        for (const mapping of this.properties.mappings) {
            ctx.fillText(
                `CC${mapping.source} → CC${mapping.target} [${mapping.min}-${mapping.max}]`,
                10,
                y
            );
            y += 20;
        }
    }
}

interface LGMIDIRouterNode extends LGraphNode {
    properties: {
        routes: { [key: number]: number[] };
    };
}

class LGMIDIRouter implements LGMIDIRouterNode {
    static title = "MIDI Router";
    static desc = "Route MIDI messages between channels";
    static color = MIDI_COLOR;

    properties: {
        routes: { [key: number]: number[] };
    };

    constructor() {
        this.addInput("in", LiteGraph.EVENT);
        for (let i = 0; i < 16; i++) {
            this.addOutput(`ch${i + 1}`, LiteGraph.EVENT);
        }

        this.properties = {
            routes: { 0: [0] }  // Default: channel 1 to channel 1
        };

        const that = this;
        this.addWidget("button", "Add Route", null, () => {
            const dialog = document.createElement("div");
            dialog.innerHTML = `
                <div>Source Channel: <select id="source">
                    ${Array.from({length: 16}, (_, i) => 
                        `<option value="${i}">Channel ${i + 1}</option>`
                    ).join("")}
                </select></div>
                <div>Target Channels: <select id="targets" multiple>
                    ${Array.from({length: 16}, (_, i) => 
                        `<option value="${i}">Channel ${i + 1}</option>`
                    ).join("")}
                </select></div>
            `;
            // Note: In a real implementation, you'd need to handle the dialog UI
            // and update the routes accordingly
        });
    }

    onAction(event: string, midi_event: MIDIEvent): void {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        const source_channel = midi_event.channel;
        const target_channels = this.properties.routes[source_channel] || [];

        for (const target of target_channels) {
            const routed_event = midi_event.clone();
            routed_event.channel = target;
            this.triggerSlot(target, routed_event);
        }
    }

    onDrawBackground(ctx: CanvasRenderingContext2D): void {
        ctx.font = "12px Arial";
        ctx.fillStyle = "#AAA";
        
        let y = 40;
        for (const [source, targets] of Object.entries(this.properties.routes)) {
            const source_num = parseInt(source) + 1;
            const target_nums = targets.map(t => t + 1).join(", ");
            ctx.fillText(
                `Ch${source_num} → Ch${target_nums}`,
                10,
                y
            );
            y += 20;
        }
    }
}

interface MIDIPattern {
    events: {
        time: number;
        data: number[];
    }[];
    length: number;  // Pattern length in ticks
}

interface LGMIDIPatternRecorderNode extends LGraphNode {
    properties: {
        recording: boolean;
        pattern_length: number;  // In beats
        quantize: boolean;
        quantize_resolution: number;  // In ticks
    };
    current_pattern?: MIDIPattern;
    record_start_time: number;
    current_time: number;
}

class LGMIDIPatternRecorder implements LGMIDIPatternRecorderNode {
    static title = "MIDI Pattern Recorder";
    static desc = "Record and play MIDI patterns";
    static color = MIDI_COLOR;

    properties: {
        recording: boolean;
        pattern_length: number;
        quantize: boolean;
        quantize_resolution: number;
    };
    current_pattern?: MIDIPattern;
    record_start_time: number;
    current_time: number;

    constructor() {
        this.addInput("in", LiteGraph.EVENT);
        this.addInput("clock", LiteGraph.EVENT);
        this.addInput("record", LiteGraph.ACTION);
        this.addInput("stop", LiteGraph.ACTION);
        this.addInput("clear", LiteGraph.ACTION);
        this.addOutput("out", LiteGraph.EVENT);

        this.properties = {
            recording: false,
            pattern_length: 4,  // 4 beats
            quantize: true,
            quantize_resolution: 24  // 1/16 note at 24 PPQ
        };

        this.record_start_time = 0;
        this.current_time = 0;

        const that = this;
        this.addWidget("toggle", "Recording", this.properties.recording, (v) => {
            that.properties.recording = v;
        });
        this.addWidget("number", "Length (beats)", this.properties.pattern_length, (v) => {
            that.properties.pattern_length = Math.max(1, Math.floor(v));
        }, { min: 1, max: 32, step: 1 });
    }

    quantizeTime(time: number): number {
        if (!this.properties.quantize) return time;
        const quantum = this.properties.quantize_resolution;
        return Math.round(time / quantum) * quantum;
    }

    onAction(event: string, data: any): void {
        switch (event) {
            case "record":
                this.properties.recording = true;
                this.record_start_time = this.current_time;
                this.current_pattern = {
                    events: [],
                    length: this.properties.pattern_length * 96  // Assuming 24 PPQ
                };
                break;

            case "stop":
                this.properties.recording = false;
                break;

            case "clear":
                this.current_pattern = undefined;
                break;

            case "clock":
                this.current_time++;
                if (this.current_pattern) {
                    const pattern_time = this.current_time % this.current_pattern.length;
                    for (const event of this.current_pattern.events) {
                        if (event.time === pattern_time) {
                            const midi_event = new MIDIEvent();
                            midi_event.setup(event.data);
                            this.trigger("out", midi_event);
                        }
                    }
                }
                break;

            default:
                if (this.properties.recording && data instanceof MIDIEvent) {
                    const relative_time = this.quantizeTime(
                        (this.current_time - this.record_start_time) % 
                        (this.properties.pattern_length * 96)
                    );
                    this.current_pattern?.events.push({
                        time: relative_time,
                        data: Array.from(data.data)
                    });
                }
        }
    }
}

interface LGMIDIProbabilityGateNode extends LGraphNode {
    properties: {
        probability: number;
        note_probability: { [key: number]: number };
        velocity_scale: number;
        velocity_random: number;
    };
}

class LGMIDIProbabilityGate implements LGMIDIProbabilityGateNode {
    static title = "MIDI Probability Gate";
    static desc = "Probabilistic MIDI event processing";
    static color = MIDI_COLOR;

    properties: {
        probability: number;
        note_probability: { [key: number]: number };
        velocity_scale: number;
        velocity_random: number;
    };

    constructor() {
        this.addInput("in", LiteGraph.EVENT);
        this.addOutput("out", LiteGraph.EVENT);

        this.properties = {
            probability: 1.0,
            note_probability: {},  // Per-note probabilities
            velocity_scale: 1.0,
            velocity_random: 0.0
        };

        const that = this;
        this.addWidget("slider", "Probability", this.properties.probability, (v) => {
            that.properties.probability = Math.clamp(v, 0, 1);
        }, { min: 0, max: 1, step: 0.01 });

        this.addWidget("slider", "Velocity Scale", this.properties.velocity_scale, (v) => {
            that.properties.velocity_scale = Math.clamp(v, 0, 2);
        }, { min: 0, max: 2, step: 0.01 });

        this.addWidget("slider", "Velocity Random", this.properties.velocity_random, (v) => {
            that.properties.velocity_random = Math.clamp(v, 0, 1);
        }, { min: 0, max: 1, step: 0.01 });
    }

    processNote(note: number, velocity: number): { pass: boolean; velocity: number } {
        // Check main probability
        if (Math.random() > this.properties.probability) {
            return { pass: false, velocity: 0 };
        }

        // Check per-note probability
        const note_prob = this.properties.note_probability[note] ?? 1.0;
        if (Math.random() > note_prob) {
            return { pass: false, velocity: 0 };
        }

        // Process velocity
        let new_velocity = velocity * this.properties.velocity_scale;
        if (this.properties.velocity_random > 0) {
            const random_factor = 1 + (Math.random() * 2 - 1) * this.properties.velocity_random;
            new_velocity *= random_factor;
        }

        return {
            pass: true,
            velocity: Math.clamp(Math.floor(new_velocity), 1, 127)
        };
    }

    onAction(event: string, midi_event: MIDIEvent): void {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        if (midi_event.cmd === MIDIEvent.NOTEON) {
            const result = this.processNote(midi_event.data[1], midi_event.data[2]);
            if (result.pass) {
                const processed_event = midi_event.clone();
                processed_event.data[2] = result.velocity;
                this.trigger("out", processed_event);
            }
        } else if (midi_event.cmd === MIDIEvent.NOTEOFF) {
            // Always pass through note-off events for notes that were passed through
            this.trigger("out", midi_event);
        } else {
            // Pass through non-note events
            this.trigger("out", midi_event);
        }
    }

    setNoteProbability(note: number, probability: number): void {
        this.properties.note_probability[note] = Math.clamp(probability, 0, 1);
    }

    clearNoteProbabilities(): void {
        this.properties.note_probability = {};
    }
}

// Register node types
if (typeof window !== 'undefined') {
    const LG = window.LiteGraph;
    LG.registerNodeType("midi/cc_processor", LGMIDICCProcessor);
    LG.registerNodeType("midi/router", LGMIDIRouter);
    LG.registerNodeType("midi/pattern_recorder", LGMIDIPatternRecorder);
    LG.registerNodeType("midi/probability_gate", LGMIDIProbabilityGate);
}
