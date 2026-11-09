import { LiteGraph } from './litegraph';
import type { LGraph as LGraphType, LGraphNode as LGraphNodeType } from './litegraph.d';

describe('LiteGraph', () => {
    let graph: LGraphType;

    beforeEach(() => {
        graph = new (LiteGraph as any).LGraph();
    });

    describe('Node Registration', () => {
        it('should register a node type', () => {
            class TestNode extends (LiteGraph as any).LGraphNode {
                constructor() {
                    super("Test Node");
                }
            }

            const registered = LiteGraph.registerNodeType("test/node", TestNode);
            expect(registered).toBe(true);
            expect(LiteGraph.registered_node_types["test/node"]).toBeDefined();
        });

        it('should not register a node type without proper parameters', () => {
            const registered = LiteGraph.registerNodeType("", null as any);
            expect(registered).toBe(false);
        });
    });

    describe('Graph Operations', () => {
        it('should start and stop the graph', () => {
            expect(graph.status).toBe(LiteGraph.STATUS_STOPPED);
            graph.start();
            expect(graph.status).toBe(LiteGraph.STATUS_RUNNING);
            graph.stop();
            expect(graph.status).toBe(LiteGraph.STATUS_STOPPED);
        });

        it('should add and remove nodes', () => {
            class TestNode extends (LiteGraph as any).LGraphNode {
                constructor() {
                    super("Test Node");
                }
            }
            LiteGraph.registerNodeType("test/node", TestNode);

            const node = LiteGraph.createNode("test/node");
            expect(node).toBeDefined();

            graph.add(node);
            expect(graph.getNodeById(node.id)).toBe(node);

            graph.remove(node);
            expect(graph.getNodeById(node.id)).toBeUndefined();
        });
    });

    describe('Graph Serialization', () => {
        it('should serialize and deserialize a graph', () => {
            class TestNode extends (LiteGraph as any).LGraphNode {
                constructor() {
                    super("Test Node");
                }
            }
            LiteGraph.registerNodeType("test/node", TestNode);

            const node = LiteGraph.createNode("test/node");
            graph.add(node);

            const serialized = graph.serialize();
            expect(serialized).toBeDefined();
            expect(serialized.nodes).toBeDefined();

            const newGraph = new (LiteGraph as any).LGraph();
            const success = newGraph.configure(serialized);
            expect(success).toBe(true);
            expect(newGraph.getNodeById(node.id)).toBeDefined();
        });
    });
});

describe('LGraphNode', () => {
    it('should create a node with correct properties', () => {
        const title = "Test Node";
        const node = new (LiteGraph as any).LGraphNode(title);

        expect(node.title).toBe(title);
        expect(node.inputs).toEqual([]);
        expect(node.outputs).toEqual([]);
        expect(node.properties).toEqual({});
    });

    it('should clone a node correctly', () => {
        const node = new (LiteGraph as any).LGraphNode("Test Node");
        node.addInput("input1", "number");
        node.addOutput("output1", "string");
        node.properties = { test: 123 };

        const cloned = node.clone();
        expect(cloned.title).toBe(node.title);
        expect(cloned.inputs.length).toBe(node.inputs.length);
        expect(cloned.outputs.length).toBe(node.outputs.length);
        expect(cloned.properties).toEqual(node.properties);
    });
});
