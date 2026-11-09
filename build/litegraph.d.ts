export declare class LiteGraph {
    static VERSION: number;
    static CANVAS_GRID_SIZE: number;
    static NODE_TITLE_HEIGHT: number;
    static NODE_TITLE_TEXT_Y: number;
    static NODE_SLOT_HEIGHT: number;
    static NODE_WIDGET_HEIGHT: number;
    static NODE_WIDTH: number;
    static NODE_MIN_WIDTH: number;
    static NODE_COLLAPSED_RADIUS: number;
    static NODE_COLLAPSED_WIDTH: number;
    static NODE_TITLE_COLOR: string;
    static NODE_TEXT_SIZE: number;
    static NODE_TEXT_COLOR: string;
    static NODE_SUBTEXT_SIZE: number;
    static NODE_DEFAULT_COLOR: string;
    static NODE_DEFAULT_BGCOLOR: string;
    static NODE_DEFAULT_BOXCOLOR: string;
    static NODE_DEFAULT_SHAPE: string;
    static NODE_BOX_OUTLINE_COLOR: string;
    static DEFAULT_SHADOW_COLOR: string;
    static DEFAULT_GROUP_FONT: number;
    static BOX_SHAPE: number;
    static ROUND_SHAPE: number;
    static CIRCLE_SHAPE: number;
    static CARD_SHAPE: number;
    static ARROW_SHAPE: number;
    static UP: number;
    static RIGHT: number;
    static DOWN: number;
    static LEFT: number;
    static LINK_COLOR: string;
    static EVENT_LINK_COLOR: string;
    static CONNECTING_LINK_COLOR: string;
    static STATUS_STOPPED: number;
    static STATUS_RUNNING: number;
    static registered_node_types: {
        [key: string]: any;
    };
    static node_types_by_file_extension: {
        [key: string]: any;
    };
    static Nodes: {
        [key: string]: any;
    };
    static debug: boolean;
    static catch_exceptions: boolean;
    static throw_errors: boolean;
    static registered_canvas_classes: {
        [key: string]: any;
    };
    static node_boxes_info: any[];
    static searchbox_extras: {
        [key: string]: any;
    };
    static getTime: () => number;
    static registerNodeType(type: string, base_class: any): boolean;
}
export default LiteGraph;
