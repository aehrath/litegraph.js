"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LGraphEditor = void 0;
const litegraph_1 = require("./litegraph");
class LGraphEditor {
    constructor(container_id, options = {}) {
        this.options = options;
        // Create graph
        const graph = new litegraph_1.LiteGraph.LGraph();
        this.graph = graph;
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.className = "graphcanvas";
        canvas.tabIndex = 1;
        this.canvas = canvas;
        // Create miniwindow
        this.miniwindow = null;
        if (!this.options.skip_render) {
            this.createMiniwindow();
        }
        // Add default callbacks if not skipped
        if (!this.options.skip_default_callbacks) {
            this.addDefaultCallbacks();
        }
        // Add canvas to container
        const container = document.getElementById(container_id);
        if (container) {
            container.appendChild(canvas);
            this.adjustCanvasSize();
        }
        else {
            console.error(`Container with id ${container_id} not found`);
        }
    }
    createMiniwindow() {
        const miniwindow = document.createElement('div');
        miniwindow.className = "litegraph miniwindow";
        miniwindow.innerHTML = "<canvas class='graphcanvas'></canvas>";
        this.miniwindow = miniwindow;
    }
    adjustCanvasSize() {
        const parent = this.canvas.parentElement;
        if (parent) {
            this.canvas.width = parent.offsetWidth;
            this.canvas.height = parent.offsetHeight;
        }
    }
    addDefaultCallbacks() {
        // Add default node callbacks
        this.graph.onNodeAdded = (node) => {
            // Handle node added
            console.log('Node added:', node);
        };
        this.graph.onNodeRemoved = (node) => {
            // Handle node removed
            console.log('Node removed:', node);
        };
        // Add more default callbacks as needed
    }
    // Public methods
    setGraph(graph) {
        this.graph = graph;
    }
    getGraph() {
        return this.graph;
    }
    load(url) {
        return new Promise((resolve, reject) => {
            fetch(url)
                .then(response => response.json())
                .then(data => {
                this.graph.configure(data);
                resolve();
            })
                .catch(reject);
        });
    }
}
exports.LGraphEditor = LGraphEditor;
// Export the editor
exports.default = LGraphEditor;
