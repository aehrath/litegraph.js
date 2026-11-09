import { LiteGraph } from '../litegraph';
import type { LGraph, LGraphNode, INodeInputSlot, INodeOutputSlot, Vector2, Vector4, LGraphCanvas, ContextMenuItem, LLink } from '../litegraph.d';

// Time node
class Time extends LiteGraph.LGraphNode {
    constructor() {
        super("Time");
        this.addOutput("in ms", "number");
        this.addOutput("in sec", "number");
    }

    onExecute(): void {
        this.setOutputData(0, this.graph.globaltime * 1000);
        this.setOutputData(1, this.graph.globaltime);
    }
}

Time.title = "Time";
Time.desc = "Time";

LiteGraph.registerNodeType("basic/time", Time);

// Subgraph: a node that contains a graph
class Subgraph extends LiteGraph.LGraphNode {
    subgraph: LGraph;
    size: Vector2;
    properties: { enabled: boolean };
    enabled: boolean;

    constructor() {
        super("Subgraph");
        this.size = [140, 80];
        this.properties = { enabled: true };
        this.enabled = true;

        // Create inner graph
        this.subgraph = new LiteGraph.LGraph();
        (this.subgraph as any)._subgraph_node = this;
        (this.subgraph as any)._is_subgraph = true;

        this.subgraph.onTrigger = this.onSubgraphTrigger.bind(this);

        // Nodes input node added inside
        this.subgraph.onNodeAdded = this.onSubgraphNewInput.bind(this);
        (this.subgraph as any).onInputRenamed = this.onSubgraphRenamedInput.bind(this);
        (this.subgraph as any).onInputTypeChanged = this.onSubgraphTypeChangeInput.bind(this);
        (this.subgraph as any).onInputRemoved = this.onSubgraphRemovedInput.bind(this);

        (this.subgraph as any).onOutputAdded = this.onSubgraphNewOutput.bind(this);
        (this.subgraph as any).onOutputRenamed = this.onSubgraphRenamedOutput.bind(this);
        (this.subgraph as any).onOutputTypeChanged = this.onSubgraphTypeChangeOutput.bind(this);
        (this.subgraph as any).onOutputRemoved = this.onSubgraphRemovedOutput.bind(this);
    }

    onSubgraphTrigger(event: string, param: any): void {
        // Handle trigger events
    }

    onSubgraphNewInput(name: string, type: string): void {
        // Handle new input
        this.addInput(name, type);
    }

    onSubgraphRenamedInput(oldname: string, name: string): void {
        // Handle renamed input
        const slot = this.findInputSlot(oldname);
        if (slot !== -1) {
            this.inputs[slot].name = name;
        }
    }

    onSubgraphTypeChangeInput(name: string, type: string): void {
        // Handle input type change
        const slot = this.findInputSlot(name);
        if (slot !== -1) {
            this.inputs[slot].type = type;
        }
    }

    onSubgraphRemovedInput(name: string): void {
        // Handle removed input
        const slot = this.findInputSlot(name);
        if (slot !== -1) {
            this.removeInput(slot);
        }
    }

    onSubgraphNewOutput(name: string, type: string): void {
        // Handle new output
        this.addOutput(name, type);
    }

    onSubgraphRenamedOutput(oldname: string, name: string): void {
        // Handle renamed output
        const slot = this.findOutputSlot(oldname);
        if (slot !== -1) {
            this.outputs[slot].name = name;
        }
    }

    onSubgraphTypeChangeOutput(name: string, type: string): void {
        // Handle output type change
        const slot = this.findOutputSlot(name);
        if (slot !== -1) {
            this.outputs[slot].type = type;
        }
    }

    onSubgraphRemovedOutput(name: string): void {
        // Handle removed output
        const slot = this.findOutputSlot(name);
        if (slot !== -1) {
            this.removeOutput(slot);
        }
    }

    getExtraMenuOptions(graphcanvas: LGraphCanvas): ContextMenuItem[] {
        const that = this;
        return [
            {
                content: "Open",
                callback: function() {
                    graphcanvas.openSubgraph(that.subgraph);
                }
            }
        ];
    }

    onResize(size: Vector2): void {
        this.size = size;
    }

    onExecute(): void {
        if (!this.enabled || !this.subgraph) {
            return;
        }

        // Send inputs to subgraph
        for (let i = 0; i < this.inputs.length; i++) {
            const input = this.inputs[i];
            const value = this.getInputData(i);
            this.subgraph.setInputData(input.name, value);
        }

        // Execute subgraph
        this.subgraph.runStep();

        // Get outputs from subgraph
        for (let i = 0; i < this.outputs.length; i++) {
            const output = this.outputs[i];
            const value = this.subgraph.getOutputData(output.name);
            this.setOutputData(i, value);
        }
    }

    clone(): Subgraph {
        const cloned = super.clone() as Subgraph;
        cloned.subgraph = this.subgraph.clone();
        return cloned;
    }
}

Subgraph.title = "Subgraph";
Subgraph.desc = "Graph inside a node";
Subgraph.title_color = "#334";

LiteGraph.Subgraph = Subgraph;
LiteGraph.registerNodeType("graph/subgraph", Subgraph);

// Input for a subgraph
class GraphInput extends LiteGraph.LGraphNode {
    properties: {
        name: string;
        type: string;
        value: any;
    };

    constructor() {
        super("GraphInput");
        this.properties = { name: "", type: "", value: null };
        this.addOutput("", "");
    }

    onExecute(): void {
        this.setOutputData(0, this.properties.value);
    }

    getTitle(): string {
        return this.properties.name || "Input";
    }
}

GraphInput.title = "Input";
GraphInput.desc = "Input of the graph";

LiteGraph.GraphInput = GraphInput;
LiteGraph.registerNodeType("graph/input", GraphInput);

// Output for a subgraph
class GraphOutput extends LiteGraph.LGraphNode {
    properties: {
        name: string;
        type: string;
    };

    constructor() {
        super("GraphOutput");
        this.properties = { name: "", type: "" };
        this.addInput("", "");
    }

    onExecute(): void {
        this.properties.value = this.getInputData(0);
    }

    getTitle(): string {
        return this.properties.name || "Output";
    }
}

GraphOutput.title = "Output";
GraphOutput.desc = "Output of the graph";

LiteGraph.GraphOutput = GraphOutput;
LiteGraph.registerNodeType("graph/output", GraphOutput);

// Constant Number
class ConstantNumber extends LiteGraph.LGraphNode {
    value: number;

    constructor() {
        super("ConstantNumber");
        this.addOutput("value", "number");
        this.addProperty("value", 1.0);
        this.value = 1.0;
        this.widget = this.addWidget("number", "value", this.value, "value");
    }

    onExecute(): void {
        this.setOutputData(0, this.value);
    }

    getTitle(): string {
        return this.value.toString();
    }
}

ConstantNumber.title = "Const Number";
ConstantNumber.desc = "Constant number";

LiteGraph.registerNodeType("basic/const", ConstantNumber);

// Constant Boolean
class ConstantBoolean extends LiteGraph.LGraphNode {
    value: boolean;

    constructor() {
        super("ConstantBoolean");
        this.addOutput("value", "boolean");
        this.addProperty("value", true);
        this.value = true;
        this.widget = this.addWidget("toggle", "value", this.value, "value");
    }

    onExecute(): void {
        this.setOutputData(0, this.value);
    }

    getTitle(): string {
        return this.value.toString();
    }

    onGetInputs(): Array<[string, string]> {
        return [["toggle", LiteGraph.ACTION]];
    }

    onAction(action: string): void {
        this.value = !this.value;
    }
}

ConstantBoolean.title = "Const Boolean";
ConstantBoolean.desc = "Constant boolean";

LiteGraph.registerNodeType("basic/boolean", ConstantBoolean);

// Constant String
class ConstantString extends LiteGraph.LGraphNode {
    value: string;

    constructor() {
        super("ConstantString");
        this.addOutput("value", "string");
        this.addProperty("value", "");
        this.value = "";
        this.widget = this.addWidget("text", "value", this.value, "value");
    }

    onExecute(): void {
        this.setOutputData(0, this.value);
    }

    getTitle(): string {
        return this.value;
    }

    onDropFile(file: File): void {
        const that = this;
        const reader = new FileReader();
        reader.onload = function(e: ProgressEvent<FileReader>) {
            that.value = e.target?.result as string;
        };
        reader.readAsText(file);
    }
}

ConstantString.title = "Const String";
ConstantString.desc = "Constant string";

LiteGraph.registerNodeType("basic/string", ConstantString);

// Constant Object
class ConstantObject extends LiteGraph.LGraphNode {
    value: any;

    constructor() {
        super("ConstantObject");
        this.addOutput("obj", "object");
        this.value = {};
    }

    onExecute(): void {
        this.setOutputData(0, this.value);
    }
}

ConstantObject.title = "Const Object";
ConstantObject.desc = "Constant Object";

LiteGraph.registerNodeType("basic/object", ConstantObject);

// Constant File
class ConstantFile extends LiteGraph.LGraphNode {
    value: string;
    url: string;
    type: "text" | "arraybuffer" | "blob" | "json";

    constructor() {
        super("ConstantFile");
        this.addInput("url", "string");
        this.addOutput("data", "");
        this.addProperty("url", "");
        this.addProperty("type", "text");
        this.value = "";
        this.url = "";
        this.type = "text";
    }

    onPropertyChanged(name: string, value: any): void {
        if (name === "url") {
            this.url = value;
            if (value) {
                this.fetchFile(value);
            }
        } else if (name === "type") {
            this.type = value;
        }
    }

    onExecute(): void {
        if (this.inputs[0]) {
            const url = this.getInputData(0);
            if (url && url !== this.url) {
                this.url = url;
                this.fetchFile(url);
            }
        }
        this.setOutputData(0, this.value);
    }

    fetchFile(url: string): void {
        if (!url || url.constructor !== String) {
            this.value = null;
            return;
        }

        const that = this;
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                switch (this.type) {
                    case "arraybuffer": return response.arrayBuffer();
                    case "text": return response.text();
                    case "blob": return response.blob();
                    case "json": return response.json();
                    default: return response.text();
                }
            })
            .then(data => {
                that.value = data;
            })
            .catch(error => {
                console.error("Error fetching file:", error);
                that.value = null;
            });
    }

    onDropFile(file: File): void {
        const that = this;
        const reader = new FileReader();
        reader.onload = function(e: ProgressEvent<FileReader>) {
            that.value = e.target?.result;
            if (that.type === "json") {
                try {
                    that.value = JSON.parse(that.value as string);
                } catch (err) {
                    console.error("Error parsing JSON:", err);
                }
            }
        };

        switch (this.type) {
            case "arraybuffer": reader.readAsArrayBuffer(file); break;
            case "text":
            case "json": reader.readAsText(file); break;
            case "blob": that.value = file; break;
            default: reader.readAsText(file);
        }
    }
}

ConstantFile.title = "Const File";
ConstantFile.desc = "Fetches a file from an url";
ConstantFile["@type"] = { type: "enum", values: ["text", "arraybuffer", "blob", "json"] };

LiteGraph.registerNodeType("basic/file", ConstantFile);

// JSON Parse
class JSONParse extends LiteGraph.LGraphNode {
    string: string;

    constructor() {
        super("JSONParse");
        this.addInput("string", "string");
        this.addInput("parse", LiteGraph.ACTION);
        this.addOutput("obj", "object");
        this.string = "";
    }

    parse(): void {
        if (!this.string) {
            return;
        }

        try {
            this.setOutputData(0, JSON.parse(this.string));
        } catch (err) {
            console.error("Error parsing JSON:", err);
        }
    }

    onExecute(): void {
        const str = this.getInputData(0);
        if (str !== this.string) {
            this.string = str;
            this.parse();
        }
    }

    onAction(name: string): void {
        if (name === "parse") {
            this.parse();
        }
    }
}

JSONParse.title = "JSON Parse";
JSONParse.desc = "Parses JSON String into object";

LiteGraph.registerNodeType("basic/jsonparse", JSONParse);

// Constant Data
class ConstantData extends LiteGraph.LGraphNode {
    value: any;

    constructor() {
        super("ConstantData");
        this.addOutput("", "");
        this.addProperty("value", "");
        this.addProperty("type", "");
        this.value = null;
        this.widget = this.addWidget("text", "value", "", "value");
    }

    onPropertyChanged(name: string, value: any): void {
        if (name === "value") {
            this.value = value;
        } else if (name === "type") {
            this.outputs[0].type = value;
        }
    }

    onExecute(): void {
        this.setOutputData(0, this.value);
    }
}

ConstantData.title = "Const Data";
ConstantData.desc = "Constant Data";

LiteGraph.registerNodeType("basic/data", ConstantData);

// Constant Array
class ConstantArray extends LiteGraph.LGraphNode {
    values: any[];

    constructor() {
        super("ConstantArray");
        this.addInput("", "");
        this.addOutput("array", "array");
        this.addProperty("values", []);
        this.values = [];
        this.size = [140, 50];
    }

    onPropertyChanged(name: string, value: any): void {
        if (name === "values") {
            if (value && value.length) {
                this.values = value;
            } else {
                this.values = [];
            }
        }
    }

    onExecute(): void {
        const input = this.getInputData(0);
        if (input !== undefined) {
            this.values[0] = input;
        }
        this.setOutputData(0, this.values);
    }
}

ConstantArray.title = "Const Array";
ConstantArray.desc = "Constant Array";

LiteGraph.registerNodeType("basic/array", ConstantArray);

// Set Array
class SetArray extends LiteGraph.LGraphNode {
    constructor() {
        super("SetArray");
        this.addInput("arr", "array");
        this.addInput("value", "");
        this.addInput("index", "number");
        this.addOutput("arr", "array");
    }

    onExecute(): void {
        const arr = this.getInputData(0);
        if (!arr || !Array.isArray(arr)) {
            return;
        }

        const value = this.getInputData(1);
        let index = this.getInputData(2);

        if (index === undefined) {
            index = arr.length;
        }

        arr[index] = value;
        this.setOutputData(0, arr);
    }
}

SetArray.title = "Set Array";
SetArray.desc = "Sets index of array";

LiteGraph.registerNodeType("basic/set_array", SetArray);

// Array Element
class ArrayElement extends LiteGraph.LGraphNode {
    constructor() {
        super("ArrayElement");
        this.addInput("array", "array,table");
        this.addInput("index", "number");
        this.addOutput("value", "");
    }

    onExecute(): void {
        const arr = this.getInputData(0);
        const index = this.getInputData(1);
        if (arr && index !== undefined) {
            this.setOutputData(0, arr[Math.floor(index)]);
        }
    }
}

ArrayElement.title = "Array[i]";
ArrayElement.desc = "Returns an element from an array";

LiteGraph.registerNodeType("basic/array[]", ArrayElement);

// Table Element
class TableElement extends LiteGraph.LGraphNode {
    constructor() {
        super("TableElement");
        this.addInput("table", "table");
        this.addInput("row", "number");
        this.addInput("col", "number");
        this.addOutput("value", "");
    }

    onExecute(): void {
        const table = this.getInputData(0);
        const row = this.getInputData(1);
        const col = this.getInputData(2);
        if (table && row !== undefined && col !== undefined) {
            const r = Math.floor(row);
            const c = Math.floor(col);
            const value = table[r] ? table[r][c] : undefined;
            this.setOutputData(0, value);
        }
    }
}

TableElement.title = "Table[row][col]";
TableElement.desc = "Returns an element from a table";

LiteGraph.registerNodeType("basic/table[][]", TableElement);

// Object Property
class ObjectProperty extends LiteGraph.LGraphNode {
    value: any;
    properties: { name: string };

    constructor() {
        super("ObjectProperty");
        this.addInput("obj", "object");
        this.addOutput("property", "");
        this.addProperty("name", "");
        this.properties = { name: "" };
        this.value = null;
    }

    setValue(v: any): void {
        this.value = v;
    }

    getTitle(): string {
        if (this.properties.name) {
            return "." + this.properties.name;
        }
        return "Property";
    }

    onPropertyChanged(name: string, value: any): void {
        this.properties[name] = value;
    }

    onExecute(): void {
        const obj = this.getInputData(0);
        if (obj) {
            this.value = obj[this.properties.name];
        }
        this.setOutputData(0, this.value);
    }
}

ObjectProperty.title = "Object property";
ObjectProperty.desc = "Outputs the property of an object";

LiteGraph.registerNodeType("basic/object_property", ObjectProperty);

// Object Keys
class ObjectKeys extends LiteGraph.LGraphNode {
    constructor() {
        super("ObjectKeys");
        this.addInput("obj", "object");
        this.addOutput("keys", "array");
    }

    onExecute(): void {
        const obj = this.getInputData(0);
        if (obj) {
            this.setOutputData(0, Object.keys(obj));
        }
    }
}

ObjectKeys.title = "Object keys";
ObjectKeys.desc = "Outputs an array with the keys of an object";

LiteGraph.registerNodeType("basic/object_keys", ObjectKeys);

// Set Object
class SetObject extends LiteGraph.LGraphNode {
    constructor() {
        super("SetObject");
        this.addInput("obj", "object");
        this.addInput("value", "");
        this.addInput("property", "string");
        this.addOutput("obj", "object");
    }

    onExecute(): void {
        const obj = this.getInputData(0);
        if (!obj) {
            return;
        }

        const value = this.getInputData(1);
        const prop = this.getInputData(2);

        if (prop) {
            obj[prop] = value;
        }
        this.setOutputData(0, obj);
    }
}

SetObject.title = "Set Object";
SetObject.desc = "Sets property of object";

LiteGraph.registerNodeType("basic/set_object", SetObject);

// Merge Objects
class MergeObjects extends LiteGraph.LGraphNode {
    constructor() {
        super("MergeObjects");
        this.addInput("A", "object");
        this.addInput("B", "object");
        this.addOutput("out", "object");
        this._result = {};
    }

    onExecute(): void {
        const A = this.getInputData(0);
        const B = this.getInputData(1);

        const result = this._result;
        if (A) {
            for (let i in A) {
                result[i] = A[i];
            }
        }
        if (B) {
            for (let i in B) {
                result[i] = B[i];
            }
        }
        this.setOutputData(0, result);
    }
}

MergeObjects.title = "Merge Objects";
MergeObjects.desc = "Creates an object copying properties from others";

LiteGraph.registerNodeType("basic/merge_objects", MergeObjects);

// Variable
class Variable extends LiteGraph.LGraphNode {
    properties: {
        name: string;
        type: string;
        value: any;
    };
    value: any;

    static LITEGRAPH = 0;  // between all graphs
    static GRAPH = 1;      // only inside this graph
    static NODE = 2;       // only in this node

    constructor() {
        super("Variable");
        this.addOutput("value", "");
        this.properties = { name: "", type: "", value: null };
        this.value = null;
    }

    onExecute(): void {
        const container = this.getContainer();
        if (container) {
            this.value = container[this.properties.name];
            this.setOutputData(0, this.value);
        }
    }

    getContainer(): { [key: string]: any } | null {
        switch (this.properties.type) {
            case Variable.LITEGRAPH:
                if (typeof global !== 'undefined') {
                    return global;
                }
                if (typeof window !== 'undefined') {
                    return window;
                }
                return null;
            case Variable.GRAPH:
                return this.graph?.vars;
            case Variable.NODE:
                return this;
            default:
                return null;
        }
    }

    getTitle(): string {
        return this.properties.name;
    }
}

Variable.title = "Variable";
Variable.desc = "Store/read variable value";

LiteGraph.registerNodeType("basic/variable", Variable);

// Download
class DownloadData extends LiteGraph.LGraphNode {
    properties: {
        filename: string;
        type: string;
    };
    data: any;

    constructor() {
        super("DownloadData");
        this.addInput("data", "");
        this.addInput("download", LiteGraph.ACTION);
        this.properties = { filename: "data.txt", type: "text" };
        this.data = null;
        this.addWidget("text", "filename", "data.txt", "filename");
    }

    downloadAsFile(): void {
        if (!this.data) {
            return;
        }

        let data = this.data;
        if (this.properties.type === "json") {
            data = JSON.stringify(data);
        }

        const file = new Blob([data]);
        const url = URL.createObjectURL(file);
        const element = document.createElement("a");
        element.setAttribute("href", url);
        element.setAttribute("download", this.properties.filename);
        element.style.display = "none";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    onAction(action: string): void {
        if (action === "download") {
            this.downloadAsFile();
        }
    }

    onExecute(): void {
        this.data = this.getInputData(0);
        if (this.data === null) {
            return;
        }
    }

    getTitle(): string {
        if (this.flags.collapsed) {
            return this.properties.filename;
        }
        return this.title;
    }
}

DownloadData.title = "Download";
DownloadData.desc = "Download data";

LiteGraph.registerNodeType("basic/download", DownloadData);

// Watch
class Watch extends LiteGraph.LGraphNode {
    value: any;

    constructor() {
        super("Watch");
        this.size = [60, 30];
        this.addInput("value", "");
        this.value = null;
    }

    onExecute(): void {
        this.value = this.getInputData(0);
    }

    getTitle(): string {
        if (this.flags.collapsed) {
            return this.toString(this.value);
        }
        return this.title;
    }

    toString(obj: any): string {
        if (obj === null) {
            return "null";
        }
        if (obj === undefined) {
            return "undef";
        }
        if (obj.constructor === Number) {
            return obj.toFixed(3);
        }
        if (obj.constructor === Array) {
            let str = "[";
            for (let i = 0; i < obj.length; ++i) {
                str += this.toString(obj[i]) + (i + 1 !== obj.length ? "," : "");
            }
            str += "]";
            return str;
        }
        return String(obj);
    }

    onDrawBackground(ctx: CanvasRenderingContext2D): void {
        this.inputs[0].label = this.toString(this.value);
    }
}

Watch.title = "Watch";
Watch.desc = "Show value of input";

LiteGraph.registerNodeType("basic/watch", Watch);
