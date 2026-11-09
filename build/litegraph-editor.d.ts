import type { LGraph as LGraphType } from './litegraph.d';
interface EditorOptions {
    skip_render?: boolean;
    skip_default_callbacks?: boolean;
}
export declare class LGraphEditor {
    private graph;
    private canvas;
    private miniwindow;
    private options;
    constructor(container_id: string, options?: EditorOptions);
    private createMiniwindow;
    private adjustCanvasSize;
    private addDefaultCallbacks;
    setGraph(graph: LGraphType): void;
    getGraph(): LGraphType;
    load(url: string): Promise<void>;
}
export default LGraphEditor;
