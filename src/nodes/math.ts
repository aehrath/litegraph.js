import { LiteGraph } from '../litegraph';
import type { INodeInputSlot, INodeOutputSlot, LGraphNode, Vector2, Vector3, Vector4 } from '../litegraph.d';

// Converter node
class Converter extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addInput("in", 0);
        this.addOutput("out", 0);
        this.size = [80, 30];
    }

    onExecute(): void {
        const v = this.getInputData(0);
        if (v == null) {
            return;
        }

        if (this.outputs) {
            for (let i = 0; i < this.outputs.length; i++) {
                const output = this.outputs[i];
                if (!output.links || !output.links.length) {
                    continue;
                }

                let result: number | Float32Array | null = null;
                switch (output.name) {
                    case "number":
                        result = Array.isArray(v) ? v[0] : parseFloat(v);
                        break;
                    case "vec2":
                    case "vec3":
                    case "vec4": {
                        let count = 1;
                        switch (output.name) {
                            case "vec2":
                                count = 2;
                                break;
                            case "vec3":
                                count = 3;
                                break;
                            case "vec4":
                                count = 4;
                                break;
                        }

                        result = new Float32Array(count);
                        if (Array.isArray(v)) {
                            for (let j = 0; j < v.length && j < count; j++) {
                                result[j] = v[j];
                            }
                        } else {
                            result[0] = v;
                        }
                        break;
                    }
                }
                this.setOutputData(i, result);
            }
        }
    }

    onGetOutputs(): INodeOutputSlot[] {
        return [
            ["number", "number"],
            ["vec2", "vec2"],
            ["vec3", "vec3"],
            ["vec4", "vec4"]
        ];
    }
}

Converter.title = "Converter";
Converter.desc = "type A to type B";

LiteGraph.registerNodeType("math/converter", Converter);

// Bypass node
class Bypass extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addInput("in", 0);
        this.addOutput("out", 0);
        this.size = [80, 30];
    }

    onExecute(): void {
        this.setOutputData(0, this.getInputData(0));
    }
}

Bypass.title = "Bypass";
Bypass.desc = "removes the type";

LiteGraph.registerNodeType("math/bypass", Bypass);

// ToNumber node
class ToNumber extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addInput("in", 0);
        this.addOutput("out", "number");
    }

    onExecute(): void {
        const v = this.getInputData(0);
        this.setOutputData(0, Number(v));
    }
}

ToNumber.title = "to Number";
ToNumber.desc = "Cast to number";

LiteGraph.registerNodeType("math/to_number", ToNumber);

// MathRange node
class MathRange extends LiteGraph.LGraphNode {
    properties: {
        in_min: number;
        in_max: number;
        out_min: number;
        out_max: number;
    };

    constructor() {
        super();
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.addProperty("in_min", 0);
        this.addProperty("in_max", 1);
        this.addProperty("out_min", 0);
        this.addProperty("out_max", 1);
        this.size = [80, 30];
        this.properties = {
            in_min: 0,
            in_max: 1,
            out_min: 0,
            out_max: 1
        };
    }

    getTitle(): string {
        if (this.flags.collapsed) {
            return this.properties.in_min + " " + this.properties.in_max + " -> " +
                this.properties.out_min + " " + this.properties.out_max;
        }
        return this.title;
    }

    onExecute(): void {
        const input = this.getInputData(0);
        if (input === undefined) {
            return;
        }

        const inMin = this.properties.in_min;
        const inMax = this.properties.in_max;
        const outMin = this.properties.out_min;
        const outMax = this.properties.out_max;

        const factor = (input - inMin) / (inMax - inMin);
        let output = 0;

        if (inMin === inMax) {
            output = outMin;
        } else {
            output = outMin + (outMax - outMin) * factor;
        }

        this.setOutputData(0, output);
    }

    onDrawBackground(ctx: CanvasRenderingContext2D): void {
        //show the current value
        if (this._value !== undefined) {
            this.outputs[0].label = this._value.toFixed(3);
        } else {
            this.outputs[0].label = "?";
        }
    }

    onGetInputs(): INodeInputSlot[] {
        return [
            ["in_min", "number"],
            ["in_max", "number"],
            ["out_min", "number"],
            ["out_max", "number"]
        ];
    }
}

MathRange.title = "Range";
MathRange.desc = "Convert a number from one range to another";

LiteGraph.registerNodeType("math/range", MathRange);

// MathRand node
class MathRand extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addOutput("value", "number");
        this.addProperty("min", 0);
        this.addProperty("max", 1);
        this.size = [80, 30];
    }

    onExecute(): void {
        if (this.inputs && this.inputs.length > 0) {
            for (let i = 0; i < this.inputs.length; ++i) {
                const input = this.inputs[i];
                const v = this.getInputData(i);
                if (v === undefined) {
                    continue;
                }
                if (input.name === "min") {
                    this.properties.min = v;
                } else if (input.name === "max") {
                    this.properties.max = v;
                }
            }
        }
        const min = this.properties.min;
        const max = this.properties.max;
        this._value = min + (max - min) * Math.random();
        this.setOutputData(0, this._value);
    }

    onDrawBackground(ctx: CanvasRenderingContext2D): void {
        if (this.flags.collapsed) {
            return;
        }
        ctx.fillStyle = "#666";
        ctx.fillText(this._value!.toFixed(3), 6, 20);
    }

    onGetInputs(): INodeInputSlot[] {
        return [["min", "number"], ["max", "number"]];
    }
}

MathRand.title = "Rand";
MathRand.desc = "Random number";

LiteGraph.registerNodeType("math/rand", MathRand);

// MathNoise node
class MathNoise extends LiteGraph.LGraphNode {
    properties: {
        min: number;
        max: number;
        smooth: boolean;
        seed: number;
        octaves: number;
        persistence: number;
        precision: number;
        scale: number;
    };
    static data: { [key: string]: number[] } | null = null;
    noise_value: number;
    time: number;

    constructor() {
        super();
        this.addOutput("out", "number");
        this.addProperty("min", 0);
        this.addProperty("max", 1);
        this.addProperty("smooth", true);
        this.addProperty("seed", 0);
        this.addProperty("octaves", 1);
        this.addProperty("persistence", 0.8);
        this.addProperty("precision", 0.01);
        this.addProperty("scale", 1);
        this.size = [90, 30];
        this.properties = {
            min: 0,
            max: 1,
            smooth: true,
            seed: 0,
            octaves: 1,
            persistence: 0.8,
            precision: 0.01,
            scale: 1
        };
        this.noise_value = 0;
        this.time = 0;
    }

    getValue(f: number, smooth: boolean): number {
        if (!MathNoise.data) {
            MathNoise.data = {};
        }
        f = f || 0;
        let data = MathNoise.data[this.properties.seed.toString()];
        if (!data) {
            data = new Float32Array(1024);
            for (let i = 0; i < data.length; ++i) {
                data[i] = Math.random();
            }
            MathNoise.data[this.properties.seed.toString()] = data;
        }
        let result = 0;
        const len = data.length;
        if (smooth) {
            const f_low = Math.floor(f);
            const f_high = Math.ceil(f);
            const lerp = f - f_low;
            result = data[f_low % len] * (1 - lerp) + data[f_high % len] * lerp;
        } else {
            result = data[Math.floor(f) % len];
        }
        return result;
    }

    onExecute(): void {
        const precision = this.properties.precision;
        const scale = this.properties.scale;
        const smooth = this.properties.smooth;
        const octaves = this.properties.octaves;
        const persistence = this.properties.persistence;
        let noise = 0;
        let time = this.time;
        let max_amplitude = 0;
        let amplitude = 1;
        for (let i = 0; i < octaves; ++i) {
            noise += this.getValue(time * scale, smooth) * amplitude;
            max_amplitude += amplitude;
            amplitude *= persistence;
            time *= 2;
        }
        noise /= max_amplitude;
        const min = this.properties.min;
        const max = this.properties.max;
        this.noise_value = min + (max - min) * noise;
        this.setOutputData(0, this.noise_value);
        this.time += precision;
    }

    onDrawBackground(ctx: CanvasRenderingContext2D): void {
        if (this.flags.collapsed) {
            return;
        }
        ctx.fillStyle = "#666";
        ctx.fillText(this.noise_value.toFixed(3), 6, 20);
    }
}

MathNoise.title = "Noise";
MathNoise.desc = "Random number with temporal continuity";

LiteGraph.registerNodeType("math/noise", MathNoise);

// MathSpikes node
class MathSpikes extends LiteGraph.LGraphNode {
    properties: {
        min_time: number;
        max_time: number;
        duration: number;
    };
    remaining_time: number;
    timer: number;

    constructor() {
        super();
        this.addOutput("out", "number");
        this.addProperty("min_time", 1);
        this.addProperty("max_time", 2);
        this.addProperty("duration", 0.2);
        this.properties = {
            min_time: 1,
            max_time: 2,
            duration: 0.2
        };
        this.size = [90, 30];
        this.remaining_time = 0;
        this.timer = 0;
    }

    onExecute(): void {
        const dt = this.graph.elapsed_time;
        this.remaining_time -= dt;
        let v = 0;
        if (this.remaining_time > 0) {
            const f = this.remaining_time / this.properties.duration;
            v = 1 / f;
        } else {
            this.timer -= dt;
            if (this.timer < 0) {
                this.timer = Math.random() *
                    (this.properties.max_time - this.properties.min_time) +
                    this.properties.min_time;
                this.remaining_time = this.properties.duration;
            }
        }
        this.setOutputData(0, v);
    }
}

MathSpikes.title = "Spikes";
MathSpikes.desc = "spike every random time";

LiteGraph.registerNodeType("math/spikes", MathSpikes);

// MathClamp node
class MathClamp extends LiteGraph.LGraphNode {
    properties: {
        min: number;
        max: number;
    };

    constructor() {
        super();
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.addProperty("min", 0);
        this.addProperty("max", 1);
        this.properties = {
            min: 0,
            max: 1
        };
        this.size = [80, 30];
    }

    onExecute(): void {
        const v = this.getInputData(0);
        if (v === undefined) {
            return;
        }
        this.setOutputData(0, Math.max(
            Math.min(v, this.properties.max),
            this.properties.min
        ));
    }

    getCode(lang: string): string {
        const code = {
            glsl: "clamp({{in}}, {{min}}, {{max}})",
            js: "Math.max(Math.min({{in}}, {{max}}), {{min}})"
        };
        return code[lang] || "";
    }
}

MathClamp.title = "Clamp";
MathClamp.desc = "Clamp number between min and max";

LiteGraph.registerNodeType("math/clamp", MathClamp);

// MathLerp node
class MathLerp extends LiteGraph.LGraphNode {
    properties: {
        f: number;
    };

    constructor() {
        super();
        this.addInput("A", "number");
        this.addInput("B", "number");
        this.addInput("f", "number");
        this.addOutput("out", "number");
        this.addProperty("f", 0.5);
        this.properties = {
            f: 0.5
        };
        this.size = [80, 30];
    }

    onExecute(): void {
        const v1 = this.getInputData(0);
        if (v1 === undefined) {
            return;
        }
        const v2 = this.getInputData(1);
        if (v2 === undefined) {
            return;
        }
        const f = this.getInputData(2);
        if (f !== undefined) {
            this.properties.f = f;
        }
        const v = v1 * (1 - this.properties.f) + v2 * this.properties.f;
        this.setOutputData(0, v);
    }

    onGetInputs(): INodeInputSlot[] {
        return [["f", "number"]];
    }
}

MathLerp.title = "Lerp";
MathLerp.desc = "Linear Interpolation";

LiteGraph.registerNodeType("math/lerp", MathLerp);

// MathAbs node
class MathAbs extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
    }

    onExecute(): void {
        const v = this.getInputData(0);
        if (v === undefined) {
            return;
        }
        this.setOutputData(0, Math.abs(v));
    }
}

MathAbs.title = "Abs";
MathAbs.desc = "Absolute";

LiteGraph.registerNodeType("math/abs", MathAbs);

// MathFloor node
class MathFloor extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
    }

    onExecute(): void {
        const v = this.getInputData(0);
        if (v === undefined) {
            return;
        }
        this.setOutputData(0, Math.floor(v));
    }
}

MathFloor.title = "Floor";
MathFloor.desc = "Floor number to remove fractional part";

LiteGraph.registerNodeType("math/floor", MathFloor);

// MathFrac node
class MathFrac extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
    }

    onExecute(): void {
        const v = this.getInputData(0);
        if (v === undefined) {
            return;
        }
        this.setOutputData(0, v % 1);
    }
}

MathFrac.title = "Frac";
MathFrac.desc = "Returns fractional part";

LiteGraph.registerNodeType("math/frac", MathFrac);

// MathSmoothStep node
class MathSmoothStep extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
    }

    onExecute(): void {
        const v = this.getInputData(0);
        if (v === undefined) {
            return;
        }
        const t = Math.clamp01(v);
        this.setOutputData(0, t * t * (3 - 2 * t));
    }
}

MathSmoothStep.title = "Smoothstep";
MathSmoothStep.desc = "Smoothstep";

LiteGraph.registerNodeType("math/smoothstep", MathSmoothStep);

// MathScale node
class MathScale extends LiteGraph.LGraphNode {
    properties: {
        factor: number;
    };

    constructor() {
        super();
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.addProperty("factor", 1);
        this.properties = {
            factor: 1
        };
        this.size = [80, 30];
    }

    onExecute(): void {
        const v = this.getInputData(0);
        if (v === undefined) {
            return;
        }
        this.setOutputData(0, v * this.properties.factor);
    }
}

MathScale.title = "Scale";
MathScale.desc = "v * factor";

LiteGraph.registerNodeType("math/scale", MathScale);

// Gate node
class Gate extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addInput("v", "boolean");
        this.addInput("A", "number");
        this.addInput("B", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
    }

    onExecute(): void {
        const v = this.getInputData(0);
        const A = this.getInputData(1);
        const B = this.getInputData(2);
        this.setOutputData(0, v ? A : B);
    }
}

Gate.title = "Gate";
Gate.desc = "if v is true, then outputs A, otherwise B";

LiteGraph.registerNodeType("math/gate", Gate);

// MathAverageFilter node
class MathAverageFilter extends LiteGraph.LGraphNode {
    properties: {
        size: number;
    };
    values: number[];
    index: number;
    current_value: number;

    constructor() {
        super();
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.addProperty("size", 10);
        this.properties = {
            size: 10
        };
        this.values = new Array(10).fill(0);
        this.index = 0;
        this.current_value = 0;
        this.size = [80, 30];
    }

    onExecute(): void {
        const v = this.getInputData(0);
        if (v === undefined) {
            return;
        }

        this.values[this.index] = v;
        this.index = (this.index + 1) % this.properties.size;

        let sum = 0;
        for (let i = 0; i < this.properties.size; ++i) {
            sum += this.values[i];
        }

        this.current_value = sum / this.properties.size;
        this.setOutputData(0, this.current_value);
    }

    onPropertyChanged(name: string, value: any): void {
        if (name === "size") {
            this.properties.size = Math.max(1, value);
            const old_values = this.values;
            this.values = new Array(this.properties.size).fill(0);
            for (let i = 0; i < Math.min(old_values.length, this.properties.size); ++i) {
                this.values[i] = old_values[i];
            }
        }
    }
}

MathAverageFilter.title = "Average";
MathAverageFilter.desc = "Average Filter";

LiteGraph.registerNodeType("math/average", MathAverageFilter);

// MathTendTo node
class MathTendTo extends LiteGraph.LGraphNode {
    properties: {
        factor: number;
    };
    value: number;

    constructor() {
        super();
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.addProperty("factor", 0.1);
        this.properties = {
            factor: 0.1
        };
        this.value = 0;
        this.size = [80, 30];
    }

    onExecute(): void {
        const v = this.getInputData(0);
        if (v === undefined) {
            return;
        }
        const f = this.properties.factor;
        this.value = this.value * (1 - f) + v * f;
        this.setOutputData(0, this.value);
    }
}

MathTendTo.title = "TendTo";
MathTendTo.desc = "moves the output value always closer to the input";

LiteGraph.registerNodeType("math/tendTo", MathTendTo);

// MathOperation node
class MathOperation extends LiteGraph.LGraphNode {
    properties: {
        OP: string;
        A: number;
        B: number;
    };
    static values: string[] = ["+", "-", "*", "/", "%", "^", "max", "min"];
    static funcs: { [key: string]: (a: number, b: number) => number } = {
        "+": (A, B) => A + B,
        "-": (A, B) => A - B,
        "*": (A, B) => A * B,
        "/": (A, B) => A / B,
        "%": (A, B) => A % B,
        "^": (A, B) => Math.pow(A, B),
        "max": (A, B) => Math.max(A, B),
        "min": (A, B) => Math.min(A, B)
    };

    constructor() {
        super();
        this.addInput("A", "number");
        this.addInput("B", "number");
        this.addOutput("=", "number");
        this.addProperty("OP", "+");
        this.addProperty("A", 1);
        this.addProperty("B", 1);
        this.properties = {
            OP: "+",
            A: 1,
            B: 1
        };
        this.size = [100, 60];
    }

    getTitle(): string {
        if (this.properties.OP === "*" || this.properties.OP === "^") {
            return "A " + this.properties.OP + " B";
        }
        return "A" + this.properties.OP + "B";
    }

    setValue(v: any): void {
        if (typeof v === "string") {
            this.properties.OP = v;
        }
    }

    onPropertyChanged(name: string, value: any): void {
        if (name === "OP" && MathOperation.values.indexOf(value) === -1) {
            this.properties.OP = MathOperation.values[0];
        }
    }

    onExecute(): void {
        const A = this.getInputData(0);
        const B = this.getInputData(1);
        if (A !== undefined) {
            this.properties.A = A;
        }
        if (B !== undefined) {
            this.properties.B = B;
        }

        const func = MathOperation.funcs[this.properties.OP];
        if (func) {
            this.setOutputData(0, func(this.properties.A, this.properties.B));
        }
    }

    onDrawBackground(ctx: CanvasRenderingContext2D): void {
        if (this.flags.collapsed) {
            return;
        }
        ctx.font = "40px Arial";
        ctx.fillStyle = "#666";
        ctx.textAlign = "center";
        ctx.fillText(this.properties.OP, this.size[0] * 0.5, this.size[1] * 0.35 + LiteGraph.NODE_TITLE_HEIGHT);
        ctx.textAlign = "left";
    }
}

LiteGraph.registerNodeType("math/operation", MathOperation);

// MathCompare node
class MathCompare extends LiteGraph.LGraphNode {
    properties: {
        A: number;
        B: number;
        OP: string;
    };
    static values: string[] = ["==", "!=", ">", "<", ">=", "<="];

    constructor() {
        super();
        this.addInput("A", "number");
        this.addInput("B", "number");
        this.addOutput("out", "boolean");
        this.addProperty("A", 0);
        this.addProperty("B", 0);
        this.addProperty("OP", "==");
        this.properties = {
            A: 0,
            B: 0,
            OP: "=="
        };
        this.size = [80, 30];
    }

    onExecute(): void {
        const A = this.getInputData(0);
        const B = this.getInputData(1);
        if (A !== undefined) {
            this.properties.A = A;
        }
        if (B !== undefined) {
            this.properties.B = B;
        }

        let result = false;
        switch (this.properties.OP) {
            case "==":
            case "=":
                result = this.properties.A == this.properties.B;
                break;
            case "!=":
            case "<>":
                result = this.properties.A != this.properties.B;
                break;
            case ">":
                result = this.properties.A > this.properties.B;
                break;
            case "<":
                result = this.properties.A < this.properties.B;
                break;
            case ">=":
                result = this.properties.A >= this.properties.B;
                break;
            case "<=":
                result = this.properties.A <= this.properties.B;
                break;
        }

        this.setOutputData(0, result);
    }

    onGetOutputs(): INodeOutputSlot[] {
        return [
            ["A==B", "boolean"],
            ["A!=B", "boolean"],
            ["A>B", "boolean"],
            ["A<B", "boolean"],
            ["A>=B", "boolean"],
            ["A<=B", "boolean"]
        ];
    }
}

MathCompare.title = "Compare";
MathCompare.desc = "compares between two values";

LiteGraph.registerNodeType("math/compare", MathCompare);

// MathCondition node
class MathCondition extends LiteGraph.LGraphNode {
    properties: {
        A: number;
        B: number;
        OP: string;
    };
    static values: string[] = [">", "<", "==", "!=", "<=", ">=", "||", "&&"];

    constructor() {
        super();
        this.addInput("A", "number,boolean");
        this.addInput("B", "number,boolean");
        this.addOutput("out", "boolean");
        this.addProperty("A", 0);
        this.addProperty("B", 0);
        this.addProperty("OP", ">");
        this.properties = {
            A: 0,
            B: 0,
            OP: ">"
        };
        this.size = [80, 30];
    }

    getTitle(): string {
        return "Cond " + this.properties.OP;
    }

    onExecute(): void {
        const A = this.getInputData(0);
        const B = this.getInputData(1);
        if (A !== undefined) {
            this.properties.A = A;
        }
        if (B !== undefined) {
            this.properties.B = B;
        }

        let result = false;
        switch (this.properties.OP) {
            case ">":
                result = this.properties.A > this.properties.B;
                break;
            case "<":
                result = this.properties.A < this.properties.B;
                break;
            case "==":
            case "=":
                result = this.properties.A == this.properties.B;
                break;
            case "!=":
            case "<>":
                result = this.properties.A != this.properties.B;
                break;
            case "<=":
                result = this.properties.A <= this.properties.B;
                break;
            case ">=":
                result = this.properties.A >= this.properties.B;
                break;
            case "||":
                result = this.properties.A || this.properties.B;
                break;
            case "&&":
                result = this.properties.A && this.properties.B;
                break;
        }

        this.setOutputData(0, result);
    }
}

MathCondition.title = "Condition";
MathCondition.desc = "evaluates condition between A and B";

LiteGraph.registerNodeType("math/condition", MathCondition);

// MathBranch node
class MathBranch extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addInput("in", "");
        this.addInput("cond", "boolean");
        this.addOutput("true", "");
        this.addOutput("false", "");
        this.size = [80, 30];
    }

    onExecute(): void {
        const value = this.getInputData(0);
        const condition = this.getInputData(1);
        if (condition) {
            this.setOutputData(0, value);
            this.setOutputData(1, null);
        } else {
            this.setOutputData(0, null);
            this.setOutputData(1, value);
        }
    }
}

MathBranch.title = "Branch";
MathBranch.desc = "If condition is true, outputs IN in true, otherwise in false";

LiteGraph.registerNodeType("math/branch", MathBranch);

// MathAccumulate node
class MathAccumulate extends LiteGraph.LGraphNode {
    value: number;

    constructor() {
        super();
        this.addInput("inc", "number");
        this.addOutput("total", "number");
        this.value = 0;
    }

    onExecute(): void {
        const inc = this.getInputData(0);
        if (inc !== undefined) {
            this.value += inc;
        }
        this.setOutputData(0, this.value);
    }
}

MathAccumulate.title = "Accumulate";
MathAccumulate.desc = "Increments a value every time";

LiteGraph.registerNodeType("math/accumulate", MathAccumulate);

// MathTrigonometry node
class MathTrigonometry extends LiteGraph.LGraphNode {
    properties: {
        mode: string;
        units: string;
    };
    static values: string[] = ["sin", "cos", "tan", "asin", "acos", "atan"];
    static units: string[] = ["radians", "degrees"];

    constructor() {
        super();
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.addProperty("mode", "sin");
        this.addProperty("units", "radians");
        this.properties = {
            mode: "sin",
            units: "radians"
        };
        this.size = [100, 30];
    }

    onExecute(): void {
        const v = this.getInputData(0);
        if (v === undefined) {
            return;
        }

        const value = this.properties.units === "radians" ? v : v * DEG2RAD;
        let result = 0;

        switch (this.properties.mode) {
            case "sin":
                result = Math.sin(value);
                break;
            case "cos":
                result = Math.cos(value);
                break;
            case "tan":
                result = Math.tan(value);
                break;
            case "asin":
                result = Math.asin(value);
                break;
            case "acos":
                result = Math.acos(value);
                break;
            case "atan":
                result = Math.atan(value);
                break;
        }

        if (this.properties.units === "degrees") {
            result *= RAD2DEG;
        }

        this.setOutputData(0, result);
    }

    onGetInputs(): INodeInputSlot[] {
        return [["in", "number"]];
    }

    onGetOutputs(): INodeOutputSlot[] {
        return [
            ["sin", "number"],
            ["cos", "number"],
            ["tan", "number"],
            ["asin", "number"],
            ["acos", "number"],
            ["atan", "number"]
        ];
    }
}

MathTrigonometry.title = "Trigonometry";
MathTrigonometry.desc = "Sin Cos Tan";

LiteGraph.registerNodeType("math/trigonometry", MathTrigonometry);

// MathFormula node
class MathFormula extends LiteGraph.LGraphNode {
    properties: {
        x: number;
        y: number;
        formula: string;
    };
    code: Function | null;
    _func: string;

    constructor() {
        super();
        this.addInput("x", "number");
        this.addInput("y", "number");
        this.addOutput("", "number");
        this.properties = {
            x: 1.0,
            y: 1.0,
            formula: "x + y"
        };
        this.code = null;
        this._func = "";
        this.size = [160, 100];
    }

    onPropertyChanged(name: string, value: any): void {
        if (name === "formula") {
            this.code = null;
        }
    }

    onExecute(): void {
        if (!this.code) {
            this._func = "return " + this.properties.formula;
            try {
                this.code = new Function("x", "y", "TIME", this._func);
            } catch (err) {
                this.code = null;
                console.error("Error parsing math formula:", err);
                return;
            }
        }

        const x = this.getInputData(0);
        const y = this.getInputData(1);
        if (x !== undefined) {
            this.properties.x = x;
        }
        if (y !== undefined) {
            this.properties.y = y;
        }

        if (this.code) {
            try {
                const result = this.code(this.properties.x, this.properties.y, 0);
                this.setOutputData(0, result);
            } catch (err) {
                console.error("Error in math formula:", err);
            }
        }
    }

    getTitle(): string {
        return this.properties.formula || "Formula";
    }

    onDrawBackground(): void {
        if (this.flags.collapsed) {
            return;
        }
        if (this._func) {
            this.outputs[0].label = this._func;
        }
    }
}

MathFormula.title = "Formula";
MathFormula.desc = "Compute formula";

LiteGraph.registerNodeType("math/formula", MathFormula);

// Math3DVec2ToXY node
class Math3DVec2ToXY extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addInput("vec2", "vec2");
        this.addOutput("x", "number");
        this.addOutput("y", "number");
    }

    onExecute(): void {
        const v = this.getInputData(0);
        if (v === undefined) {
            return;
        }

        this.setOutputData(0, v[0]);
        this.setOutputData(1, v[1]);
    }
}

Math3DVec2ToXY.title = "Vec2->XY";
Math3DVec2ToXY.desc = "vector 2 to components";

LiteGraph.registerNodeType("math3d/vec2-to-xy", Math3DVec2ToXY);

// Math3DXYToVec2 node
class Math3DXYToVec2 extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addInput("x", "number");
        this.addInput("y", "number");
        this.addOutput("vec2", "vec2");
    }

    onExecute(): void {
        const x = this.getInputData(0);
        const y = this.getInputData(1);
        if (x === undefined || y === undefined) {
            return;
        }

        this.setOutputData(0, new Float32Array([x, y]));
    }
}

Math3DXYToVec2.title = "XY->Vec2";
Math3DXYToVec2.desc = "components to vector2";

LiteGraph.registerNodeType("math3d/xy-to-vec2", Math3DXYToVec2);

// Math3DVec3ToXYZ node
class Math3DVec3ToXYZ extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addInput("vec3", "vec3");
        this.addOutput("x", "number");
        this.addOutput("y", "number");
        this.addOutput("z", "number");
    }

    onExecute(): void {
        const v = this.getInputData(0);
        if (v === undefined) {
            return;
        }

        this.setOutputData(0, v[0]);
        this.setOutputData(1, v[1]);
        this.setOutputData(2, v[2]);
    }
}

Math3DVec3ToXYZ.title = "Vec3->XYZ";
Math3DVec3ToXYZ.desc = "vector 3 to components";

LiteGraph.registerNodeType("math3d/vec3-to-xyz", Math3DVec3ToXYZ);

// Math3DXYZToVec3 node
class Math3DXYZToVec3 extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addInput("x", "number");
        this.addInput("y", "number");
        this.addInput("z", "number");
        this.addOutput("vec3", "vec3");
    }

    onExecute(): void {
        const x = this.getInputData(0);
        const y = this.getInputData(1);
        const z = this.getInputData(2);
        if (x === undefined || y === undefined || z === undefined) {
            return;
        }

        this.setOutputData(0, new Float32Array([x, y, z]));
    }
}

Math3DXYZToVec3.title = "XYZ->Vec3";
Math3DXYZToVec3.desc = "components to vector3";

LiteGraph.registerNodeType("math3d/xyz-to-vec3", Math3DXYZToVec3);

// Math3DVec4ToXYZW node
class Math3DVec4ToXYZW extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addInput("vec4", "vec4");
        this.addOutput("x", "number");
        this.addOutput("y", "number");
        this.addOutput("z", "number");
        this.addOutput("w", "number");
    }

    onExecute(): void {
        const v = this.getInputData(0);
        if (v === undefined) {
            return;
        }

        this.setOutputData(0, v[0]);
        this.setOutputData(1, v[1]);
        this.setOutputData(2, v[2]);
        this.setOutputData(3, v[3]);
    }
}

Math3DVec4ToXYZW.title = "Vec4->XYZW";
Math3DVec4ToXYZW.desc = "vector 4 to components";

LiteGraph.registerNodeType("math3d/vec4-to-xyzw", Math3DVec4ToXYZW);

// Math3DXYZWToVec4 node
class Math3DXYZWToVec4 extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.addInput("x", "number");
        this.addInput("y", "number");
        this.addInput("z", "number");
        this.addInput("w", "number");
        this.addOutput("vec4", "vec4");
    }

    onExecute(): void {
        const x = this.getInputData(0);
        const y = this.getInputData(1);
        const z = this.getInputData(2);
        const w = this.getInputData(3);
        if (x === undefined || y === undefined || z === undefined || w === undefined) {
            return;
        }

        this.setOutputData(0, new Float32Array([x, y, z, w]));
    }
}

Math3DXYZWToVec4.title = "XYZW->Vec4";
Math3DXYZWToVec4.desc = "components to vector4";

LiteGraph.registerNodeType("math3d/xyzw-to-vec4", Math3DXYZWToVec4);

// Constants
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// Helper function
declare global {
    interface Math {
        clamp01(v: number): number;
    }
}

Math.clamp01 = function(v: number): number {
    return Math.max(0, Math.min(1, v));
};
