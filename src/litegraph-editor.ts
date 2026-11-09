import { LiteGraph } from './litegraph';
import type { LGraph as LGraphType, LGraphNode as LGraphNodeType } from './litegraph.d';

interface EditorOptions {
    skip_render?: boolean;
    skip_default_callbacks?: boolean;
}

export class LGraphEditor {
    private graph: LGraphType;
    private canvas: HTMLCanvasElement;
    private miniwindow: HTMLDivElement | null;
    private options: EditorOptions;

    constructor(container_id: string, options: EditorOptions = {}) {
        this.options = options;

        // Create graph
        const graph = new (LiteGraph as any).LGraph();
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
        } else {
            console.error(`Container with id ${container_id} not found`);
        }
    }

    private createMiniwindow(): void {
        const miniwindow = document.createElement('div');
        miniwindow.className = "litegraph miniwindow";
        miniwindow.innerHTML = "<canvas class='graphcanvas'></canvas>";
        this.miniwindow = miniwindow;
    }

    private adjustCanvasSize(): void {
        const parent = this.canvas.parentElement;
        if (parent) {
            this.canvas.width = parent.offsetWidth;
            this.canvas.height = parent.offsetHeight;
        }
    }

    private addDefaultCallbacks(): void {
        // Add default node callbacks
        this.graph.onNodeAdded = (node: LGraphNodeType) => {
            // Handle node added
            console.log('Node added:', node);
        };

        this.graph.onNodeRemoved = (node: LGraphNodeType) => {
            // Handle node removed
            console.log('Node removed:', node);
        };

        // Add more default callbacks as needed
    }

    // Public methods
    public setGraph(graph: LGraphType): void {
        this.graph = graph;
    }

    public getGraph(): LGraphType {
        return this.graph;
    }

    public load(url: string): Promise<void> {
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

// Export the editor
export default LGraphEditor;
