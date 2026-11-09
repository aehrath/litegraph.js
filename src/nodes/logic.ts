import { LGraphNode, IWidget, LiteGraph, SerializedLGraphNode, LConnectionKind } from "../core/LiteGraph.js";

interface SelectorNode extends LGraphNode {
    selected: number;
}

class Selector implements SelectorNode {
    selected: number;
    properties: Record<string, any> = {};
    size: [number, number] = [140, 35];
    flags: Record<string, any> = {};

    constructor() {
        this.addInput("sel", "number");
        this.addInput("A");
        this.addInput("B");
        this.addInput("C");
        this.addInput("D");
        this.addOutput("out");

        this.selected = 0;
    }

    onDrawBackground(ctx: CanvasRenderingContext2D): void {
        if (this.flags.collapsed) {
            return;
        }
        ctx.fillStyle = "#AFB";
        const y = (this.selected + 1) * LiteGraph.NODE_SLOT_HEIGHT + 6;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(50, y + LiteGraph.NODE_SLOT_HEIGHT);
        ctx.lineTo(34, y + LiteGraph.NODE_SLOT_HEIGHT * 0.5);
        ctx.fill();
    }

    onExecute(): void {
        let sel = this.getInputData(0);
        if (sel == null || typeof sel !== "number") {
            sel = 0;
        }
        this.selected = sel = Math.round(sel) % (this.inputs.length - 1);
        const v = this.getInputData(sel + 1);
        if (v !== undefined) {
            this.setOutputData(0, v);
        }
    }

    onGetInputs(): [string, number][] {
        return [["E", 0], ["F", 0], ["G", 0], ["H", 0]];
    }
}

Selector.title = "Selector";
Selector.desc = "selects an output";

interface SequenceNode extends LGraphNode {
    index: number;
    values: string[];
    current_sequence?: string;
    properties: {
        sequence: string;
    };
}

class Sequence implements SequenceNode {
    index: number;
    values: string[];
    current_sequence?: string;
    properties: {
        sequence: string;
    };
    size: [number, number] = [140, 35];

    constructor() {
        this.properties = {
            sequence: "A,B,C"
        };
        this.addInput("index", "number");
        this.addInput("seq");
        this.addOutput("out");

        this.index = 0;
        this.values = this.properties.sequence.split(",");
    }

    onPropertyChanged(name: string, value: any): void {
        if (name == "sequence") {
            this.values = value.split(",");
        }
    }

    onExecute(): void {
        const seq = this.getInputData(1);
        if (seq && seq != this.current_sequence) {
            this.values = seq.split(",");
            this.current_sequence = seq;
        }
        let index = this.getInputData(0);
        if (index == null) {
            index = 0;
        }
        this.index = index = Math.round(index) % this.values.length;

        this.setOutputData(0, this.values[index]);
    }
}

Sequence.title = "Sequence";
Sequence.desc = "select one element from a sequence from a string";

class LogicAnd extends LGraphNode {
    constructor() {
        super();
        this.properties = {};
        this.addInput("a", "boolean");
        this.addInput("b", "boolean");
        this.addOutput("out", "boolean");
    }

    onExecute(): void {
        let ret = true;
        for (const inX in this.inputs) {
            if (!this.getInputData(inX)) {
                ret = false;
                break;
            }
        }
        this.setOutputData(0, ret);
    }

    onGetInputs(): [string, string][] {
        return [["and", "boolean"]];
    }
}

LogicAnd.title = "AND";
LogicAnd.desc = "Return true if all inputs are true";

class LogicOr extends LGraphNode {
    constructor() {
        super();
        this.properties = {};
        this.addInput("a", "boolean");
        this.addInput("b", "boolean");
        this.addOutput("out", "boolean");
    }

    onExecute(): void {
        let ret = false;
        for (const inX in this.inputs) {
            if (this.getInputData(inX)) {
                ret = true;
                break;
            }
        }
        this.setOutputData(0, ret);
    }

    onGetInputs(): [string, string][] {
        return [["or", "boolean"]];
    }
}

LogicOr.title = "OR";
LogicOr.desc = "Return true if at least one input is true";

class LogicNot extends LGraphNode {
    constructor() {
        super();
        this.properties = {};
        this.addInput("in", "boolean");
        this.addOutput("out", "boolean");
    }

    onExecute(): void {
        const ret = !this.getInputData(0);
        this.setOutputData(0, ret);
    }
}

LogicNot.title = "NOT";
LogicNot.desc = "Return the logical negation";

class LogicCompare extends LGraphNode {
    constructor() {
        super();
        this.properties = {};
        this.addInput("a", "boolean");
        this.addInput("b", "boolean");
        this.addOutput("out", "boolean");
    }

    onExecute(): void {
        let last: boolean | null = null;
        let ret = true;
        for (const inX in this.inputs) {
            const current = this.getInputData(inX);
            if (last === null) {
                last = current;
            } else if (last != current) {
                ret = false;
                break;
            }
        }
        this.setOutputData(0, ret);
    }

    onGetInputs(): [string, string][] {
        return [["bool", "boolean"]];
    }
}

LogicCompare.title = "bool == bool";
LogicCompare.desc = "Compare for logical equality";

class LogicBranch extends LGraphNode {
    constructor() {
        super();
        this.properties = {};
        this.addInput("onTrigger", LiteGraph.ACTION);
        this.addInput("condition", "boolean");
        this.addOutput("true", LiteGraph.EVENT);
        this.addOutput("false", LiteGraph.EVENT);
        this.mode = LiteGraph.ON_TRIGGER;
    }

    onExecute(param: any, options: any): void {
        const condition = this.getInputData(1);
        if (condition) {
            this.triggerSlot(0);
        } else {
            this.triggerSlot(1);
        }
    }
}

LogicBranch.title = "Branch";
LogicBranch.desc = "Branch execution on condition";

// Register all node types
if (typeof window !== 'undefined') {
    const LG = window.LiteGraph;
    LG.registerNodeType("logic/selector", Selector);
    LG.registerNodeType("logic/sequence", Sequence);
    LG.registerNodeType("logic/AND", LogicAnd);
    LG.registerNodeType("logic/OR", LogicOr);
    LG.registerNodeType("logic/NOT", LogicNot);
    LG.registerNodeType("logic/CompareBool", LogicCompare);
    LG.registerNodeType("logic/IF", LogicBranch);
}
