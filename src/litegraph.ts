import type {
    Vector2,
    Vector4,
    widgetTypes,
    SlotShape,
    INodeSlot,
    INodeInputSlot,
    INodeOutputSlot,
    IWidget,
    IButtonWidget,
    IToggleWidget,
    ISliderWidget,
    INumberWidget,
    IComboWidget,
    ITextWidget,
    IContextMenuItem,
    IContextMenuOptions,
    ContextMenuItem,
    ContextMenuEventListener,
    serializedLGraph,
    LGraph as LGraphType,
    SerializedLLink,
    LLink as LLinkType,
    SerializedLGraphNode
} from './litegraph.d';

export class LiteGraph {
    static VERSION: number = 0.4;
    static CANVAS_GRID_SIZE: number = 10;

    // Used in LGraphNode
    static NODE_TITLE_HEIGHT: number = 30;
    static NODE_TITLE_TEXT_Y: number = 20;
    static NODE_SLOT_HEIGHT: number = 20;
    static NODE_WIDGET_HEIGHT: number = 20;
    static NODE_WIDTH: number = 140;
    static NODE_MIN_WIDTH: number = 50;
    static NODE_COLLAPSED_RADIUS: number = 10;
    static NODE_COLLAPSED_WIDTH: number = 80;
    static NODE_TITLE_COLOR: string = "#999";
    static NODE_TEXT_SIZE: number = 14;
    static NODE_TEXT_COLOR: string = "#AAA";
    static NODE_SUBTEXT_SIZE: number = 12;
    static NODE_DEFAULT_COLOR: string = "#333";
    static NODE_DEFAULT_BGCOLOR: string = "#353535";
    static NODE_DEFAULT_BOXCOLOR: string = "#666";
    static NODE_DEFAULT_SHAPE: string = "box";
    static NODE_BOX_OUTLINE_COLOR: string = "#FFF";
    static DEFAULT_SHADOW_COLOR: string = "rgba(0,0,0,0.5)";
    static DEFAULT_GROUP_FONT: number = 24;

    // Shapes
    static BOX_SHAPE: number = 1;
    static ROUND_SHAPE: number = 2;
    static CIRCLE_SHAPE: number = 3;
    static CARD_SHAPE: number = 4;
    static ARROW_SHAPE: number = 5;

    // Direction
    static UP: number = 1;
    static RIGHT: number = 2;
    static DOWN: number = 3;
    static LEFT: number = 4;

    static LINK_COLOR: string = "#9A9";
    static EVENT_LINK_COLOR: string = "#A86";
    static CONNECTING_LINK_COLOR: string = "#AFA";

    // Status
    static STATUS_STOPPED: number = 1;
    static STATUS_RUNNING: number = 2;

    static registered_node_types: { [key: string]: any } = {};
    static node_types_by_file_extension: { [key: string]: any } = {};
    static Nodes: { [key: string]: any } = {};

    static debug: boolean = false;
    static catch_exceptions: boolean = true;
    static throw_errors: boolean = true;
    static registered_canvas_classes: { [key: string]: any } = {};
    static node_boxes_info: any[] = [];
    static searchbox_extras: { [key: string]: any } = {};

    static getTime: () => number = typeof performance !== "undefined" 
        ? performance.now.bind(performance)
        : Date.now.bind(Date);

    static registerNodeType(type: string, base_class: any): boolean {
        if (!type || !base_class)
            return false;

        // Register node class
        const classname = base_class.name;
        const pos = type.lastIndexOf("/");
        base_class.category = pos !== -1 ? type.substring(0, pos) : "";
        
        if (LiteGraph.debug)
            console.log(`Node registered: ${type}`);

        const prev = this.registered_node_types[type];
        if (prev)
            console.log(`replacing node type: ${type}`);

        this.registered_node_types[type] = base_class;
        if (base_class.constructor.name)
            this.Nodes[classname] = base_class;

        return true;
    }

    // More methods to be converted...
}

// Export the LiteGraph instance
const global = (typeof window !== 'undefined' ? window : globalThis);
(global as any).LiteGraph = LiteGraph;
export default LiteGraph;
