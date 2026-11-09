import { LGraphNode, IWidget, LiteGraph, SerializedLGraphNode } from "../core/LiteGraph.js";

// Helper functions with proper type definitions
function toString(a: any): string {
    if (a && a.constructor === Object) {
        try {
            return JSON.stringify(a);
        } catch (err) {
            return String(a);
        }
    }
    return String(a);
}

function compare(a: string, b: string): boolean {
    return a == b;
}

function concatenate(a?: string, b?: string): string {
    if (a === undefined) {
        return b || "";
    }
    if (b === undefined) {
        return a;
    }
    return a + b;
}

function contains(a?: string, b?: string): boolean {
    if (a === undefined || b === undefined) {
        return false;
    }
    return a.indexOf(b) != -1;
}

function toUpperCase(a: string | null): string | null {
    if (a != null && typeof a === "string") {
        return a.toUpperCase();
    }
    return a;
}

interface SplitProperties {
    separator: string;
}

function split(str: string | string[] | null, separator: string | null, properties: SplitProperties): string[] | string[][] | null {
    if (separator == null) {
        separator = properties.separator;
    }
    if (str == null) {
        return [];
    }
    if (typeof str === "string") {
        return str.split(separator || " ");
    } else if (Array.isArray(str)) {
        return str.map(item => {
            return typeof item === "string" ? item.split(separator || " ") : [];
        });
    }
    return null;
}

interface ToFixedProperties {
    precision: number;
}

function toFixed(this: { properties: ToFixedProperties }, a: number | null): string | null {
    if (a != null && typeof a === "number") {
        return a.toFixed(this.properties.precision);
    }
    return null;
}

interface StringToTableNode extends LGraphNode {
    properties: {
        value: string;
        separator: string;
    };
    _table: string[][] | null;
    _str?: string;
    _last_separator?: string;
}

class StringToTable implements StringToTableNode {
    properties: {
        value: string;
        separator: string;
    };
    _table: string[][] | null;
    _str?: string;
    _last_separator?: string;
    size: [number, number] = [140, 35];

    constructor() {
        this.addInput("", "string");
        this.addOutput("table", "table");
        this.addOutput("rows", "number");
        this.properties = {
            value: "",
            separator: ","
        };
        this._table = null;
    }

    onExecute(): void {
        const input = this.getInputData(0) as string;
        if (!input) {
            return;
        }
        const separator = this.properties.separator || ",";
        if (input != this._str || separator != this._last_separator) {
            this._last_separator = separator;
            this._str = input;
            this._table = input.split("\n").map(line => line.trim().split(separator));
        }
        this.setOutputData(0, this._table);
        this.setOutputData(1, this._table ? this._table.length : 0);
    }
}

StringToTable.title = "toTable";
StringToTable.desc = "Splits a string to table";

// Register all node types
if (typeof window !== 'undefined') {
    const LG = window.LiteGraph;
    
    // Register wrapped function nodes
    LG.wrapFunctionAsNode("string/toString", toString, [""], "string");
    LG.wrapFunctionAsNode("string/compare", compare, ["string", "string"], "boolean");
    LG.wrapFunctionAsNode("string/concatenate", concatenate, ["string", "string"], "string");
    LG.wrapFunctionAsNode("string/contains", contains, ["string", "string"], "boolean");
    LG.wrapFunctionAsNode("string/toUpperCase", toUpperCase, ["string"], "string");
    LG.wrapFunctionAsNode("string/split", split, ["string,array", "string"], "array", { separator: "," });
    LG.wrapFunctionAsNode("string/toFixed", toFixed, ["number"], "string", { precision: 0 });
    
    // Register class-based nodes
    LG.registerNodeType("string/toTable", StringToTable);
}
