"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiteGraph = void 0;
class LiteGraph {
    static registerNodeType(type, base_class) {
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
}
exports.LiteGraph = LiteGraph;
LiteGraph.VERSION = 0.4;
LiteGraph.CANVAS_GRID_SIZE = 10;
// Used in LGraphNode
LiteGraph.NODE_TITLE_HEIGHT = 30;
LiteGraph.NODE_TITLE_TEXT_Y = 20;
LiteGraph.NODE_SLOT_HEIGHT = 20;
LiteGraph.NODE_WIDGET_HEIGHT = 20;
LiteGraph.NODE_WIDTH = 140;
LiteGraph.NODE_MIN_WIDTH = 50;
LiteGraph.NODE_COLLAPSED_RADIUS = 10;
LiteGraph.NODE_COLLAPSED_WIDTH = 80;
LiteGraph.NODE_TITLE_COLOR = "#999";
LiteGraph.NODE_TEXT_SIZE = 14;
LiteGraph.NODE_TEXT_COLOR = "#AAA";
LiteGraph.NODE_SUBTEXT_SIZE = 12;
LiteGraph.NODE_DEFAULT_COLOR = "#333";
LiteGraph.NODE_DEFAULT_BGCOLOR = "#353535";
LiteGraph.NODE_DEFAULT_BOXCOLOR = "#666";
LiteGraph.NODE_DEFAULT_SHAPE = "box";
LiteGraph.NODE_BOX_OUTLINE_COLOR = "#FFF";
LiteGraph.DEFAULT_SHADOW_COLOR = "rgba(0,0,0,0.5)";
LiteGraph.DEFAULT_GROUP_FONT = 24;
// Shapes
LiteGraph.BOX_SHAPE = 1;
LiteGraph.ROUND_SHAPE = 2;
LiteGraph.CIRCLE_SHAPE = 3;
LiteGraph.CARD_SHAPE = 4;
LiteGraph.ARROW_SHAPE = 5;
// Direction
LiteGraph.UP = 1;
LiteGraph.RIGHT = 2;
LiteGraph.DOWN = 3;
LiteGraph.LEFT = 4;
LiteGraph.LINK_COLOR = "#9A9";
LiteGraph.EVENT_LINK_COLOR = "#A86";
LiteGraph.CONNECTING_LINK_COLOR = "#AFA";
// Status
LiteGraph.STATUS_STOPPED = 1;
LiteGraph.STATUS_RUNNING = 2;
LiteGraph.registered_node_types = {};
LiteGraph.node_types_by_file_extension = {};
LiteGraph.Nodes = {};
LiteGraph.debug = false;
LiteGraph.catch_exceptions = true;
LiteGraph.throw_errors = true;
LiteGraph.registered_canvas_classes = {};
LiteGraph.node_boxes_info = [];
LiteGraph.searchbox_extras = {};
LiteGraph.getTime = typeof performance !== "undefined"
    ? performance.now.bind(performance)
    : Date.now.bind(Date);
// Export the LiteGraph instance
const global = (typeof window !== 'undefined' ? window : globalThis);
global.LiteGraph = LiteGraph;
exports.default = LiteGraph;
