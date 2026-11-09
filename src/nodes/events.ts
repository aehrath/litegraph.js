import { LiteGraph } from '../litegraph';
import type { LGraphNode, Vector2 } from '../litegraph.d';

// Log Event node
class LogEvent extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.size = [60, 30];
        this.addInput("event", LiteGraph.ACTION);
    }

    onAction(action: string, param: any, options: any): void {
        console.log(action, param);
    }
}

LogEvent.title = "Log Event";
LogEvent.desc = "Log event in console";

LiteGraph.registerNodeType("events/log", LogEvent);

// Trigger Event node
class TriggerEvent extends LiteGraph.LGraphNode {
    properties: {
        only_on_change: boolean;
    };
    prev: any;

    constructor() {
        super();
        this.size = [60, 30];
        this.addInput("if", "");
        this.addOutput("true", LiteGraph.EVENT);
        this.addOutput("change", LiteGraph.EVENT);
        this.addOutput("false", LiteGraph.EVENT);
        this.properties = { only_on_change: true };
        this.prev = 0;
    }

    onExecute(param?: any, options?: any): void {
        const v = this.getInputData(0);
        const changed = (v != this.prev);
        if (this.prev === 0) {
            return;
        }
        const must_resend = (changed && this.properties.only_on_change) || (!changed && !this.properties.only_on_change);
        if (v && must_resend) {
            this.triggerSlot(0, param, null, options);
        }
        if (!v && must_resend) {
            this.triggerSlot(2, param, null, options);
        }
        if (changed) {
            this.triggerSlot(1, param, null, options);
        }
        this.prev = v;
    }
}

TriggerEvent.title = "TriggerEvent";
TriggerEvent.desc = "Triggers event if input evaluates to true";

LiteGraph.registerNodeType("events/trigger", TriggerEvent);

// Sequence node
class Sequence extends LiteGraph.LGraphNode {
    properties: {
        sequence_outputs: number;
    };
    current_sequence: number;

    constructor() {
        super();
        this.properties = { sequence_outputs: 1 };
        this.addInput("", LiteGraph.ACTION);
        this.addInput("stop", LiteGraph.ACTION);
        this.addInput("reset", LiteGraph.ACTION);
        this.current_sequence = 0;
        this.updateOutputs();
    }

    onAction(action: string, param: any, options: any): void {
        if (action == "reset") {
            this.current_sequence = 0;
            return;
        }
        if (action == "stop") {
            this.current_sequence = this.properties.sequence_outputs;
            return;
        }

        if (this.current_sequence >= this.properties.sequence_outputs) {
            this.current_sequence = 0;
        }
        this.triggerSlot(this.current_sequence, param, null, options);
        this.current_sequence++;
    }

    updateOutputs(): void {
        const n = this.properties.sequence_outputs || 1;
        for (let i = 0; i < n; ++i) {
            const output_name = i.toString();
            if (!this.outputs[i]) {
                this.addOutput(output_name, LiteGraph.EVENT);
            } else {
                this.outputs[i].name = output_name;
            }
        }
        // Remove extra outputs
        for (let i = n; i < this.outputs.length; ++i) {
            this.removeOutput(i);
        }
    }

    getTitle(): string {
        return "Sequence";
    }
}

Sequence.title = "Sequence";
Sequence.desc = "Triggers a sequence of events when an event arrives";

LiteGraph.registerNodeType("events/sequence", Sequence);

// WaitAll node
class WaitAll extends LiteGraph.LGraphNode {
    waiting: boolean[];
    slots: number;

    constructor() {
        super();
        this.properties = { slots: 2 };
        this.slots = 2;
        this.waiting = new Array(this.slots);
        this.addOutput("out", LiteGraph.EVENT);
        this.updateInputs();
    }

    updateInputs(): void {
        for (let i = 0; i < this.slots; ++i) {
            const input_name = i.toString();
            if (!this.inputs[i]) {
                this.addInput(input_name, LiteGraph.EVENT);
            } else {
                this.inputs[i].name = input_name;
            }
        }
        // Remove extra inputs
        for (let i = this.slots; i < this.inputs.length; ++i) {
            this.removeInput(i);
        }
    }

    onAction(action: string, param: any, options: any, slot_index: number): void {
        this.waiting[slot_index] = true;
        for (let i = 0; i < this.waiting.length; ++i) {
            if (!this.waiting[i]) {
                return;
            }
        }
        this.triggerSlot(0, param, null, options);
        this.reset();
    }

    reset(): void {
        for (let i = 0; i < this.waiting.length; ++i) {
            this.waiting[i] = false;
        }
    }

    getTitle(): string {
        return "WaitAll";
    }
}

WaitAll.title = "WaitAll";
WaitAll.desc = "Wait until all input events arrive then triggers output";

LiteGraph.registerNodeType("events/waitAll", WaitAll);

// More event nodes will be added here...
