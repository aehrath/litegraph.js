import { LiteGraph } from '../litegraph';
import type { LGraph, LGraphNode, INodeInputSlot, INodeOutputSlot, Vector2, Vector3, Vector4, LGraphCanvas, ContextMenuItem } from '../litegraph.d';

// Global matrices used for rendering
const view_matrix = new Float32Array(16);
const projection_matrix = new Float32Array(16);
const viewprojection_matrix = new Float32Array(16);
const model_matrix = new Float32Array(16);
const global_uniforms = {
    u_view: view_matrix,
    u_projection: projection_matrix,
    u_viewprojection: viewprojection_matrix,
    u_model: model_matrix
};

LiteGraph.LGraphRender = {
    onRequestCameraMatrices: null // overwrite with your 3D engine specifics
};

function generateGeometryId(): number {
    return (Math.random() * 100000) | 0;
}

// Points3D Node
class LGraphPoints3D extends LiteGraph.LGraphNode {
    static RECTANGLE = 1;
    static CIRCLE = 2;
    static CUBE = 10;
    static SPHERE = 11;
    static HEMISPHERE = 12;
    static INSIDE_SPHERE = 13;
    static OBJECT = 20;
    static OBJECT_UNIFORMLY = 21;
    static OBJECT_INSIDE = 22;

    static MODE_VALUES = {
        "rectangle": LGraphPoints3D.RECTANGLE,
        "circle": LGraphPoints3D.CIRCLE,
        "cube": LGraphPoints3D.CUBE,
        "sphere": LGraphPoints3D.SPHERE,
        "hemisphere": LGraphPoints3D.HEMISPHERE,
        "inside_sphere": LGraphPoints3D.INSIDE_SPHERE,
        "object": LGraphPoints3D.OBJECT,
        "object_uniformly": LGraphPoints3D.OBJECT_UNIFORMLY,
        "object_inside": LGraphPoints3D.OBJECT_INSIDE
    };

    static widgets_info = {
        mode: { widget: "combo", values: LGraphPoints3D.MODE_VALUES }
    };

    static title = "list of points";
    static desc = "returns an array of points";

    properties: {
        radius: number;
        num_points: number;
        generate_normals: boolean;
        regular: boolean;
        mode: number;
        force_update: boolean;
    };

    points: Float32Array;
    normals: Float32Array;
    must_update: boolean;
    version: number;
    geometry: {
        vertices: Float32Array | null;
        normals?: Float32Array;
        _id: number;
        _version?: number;
    };

    private _old_obj: any;
    private _old_obj_version: any;
    private _last_radius: number | null;

    constructor() {
        super("Points3D");

        this.addInput("obj", "");
        this.addInput("radius", "number");
        this.addOutput("out", "geometry");
        this.addOutput("points", "[vec3]");

        this.properties = {
            radius: 1,
            num_points: 4096,
            generate_normals: true,
            regular: false,
            mode: LGraphPoints3D.SPHERE,
            force_update: false
        };

        this.points = new Float32Array(this.properties.num_points * 3);
        this.normals = new Float32Array(this.properties.num_points * 3);
        this.must_update = true;
        this.version = 0;

        this.addWidget("button", "update", null, () => { this.must_update = true; });

        this.geometry = {
            vertices: null,
            _id: generateGeometryId()
        };

        this._old_obj = null;
        this._last_radius = null;
    }

    onPropertyChanged(name: string, value: any): void {
        this.must_update = true;
    }

    onExecute(): void {
        const obj = this.getInputData(0);
        if (obj !== this._old_obj || (obj && obj._version !== this._old_obj_version)) {
            this._old_obj = obj;
            this.must_update = true;
        }

        let radius = this.getInputData(1);
        if (radius == null) {
            radius = this.properties.radius;
        }
        if (this._last_radius !== radius) {
            this._last_radius = radius;
            this.must_update = true;
        }

        if (this.must_update || this.properties.force_update) {
            this.must_update = false;
            this.updatePoints();
        }

        this.geometry.vertices = this.points;
        this.geometry.normals = this.normals;
        this.geometry._version = this.version;

        this.setOutputData(0, this.geometry);
    }

    updatePoints(): void {
        let num_points = this.properties.num_points | 0;
        if (num_points < 1) {
            num_points = 1;
        }

        if (!this.points || this.points.length !== num_points * 3) {
            this.points = new Float32Array(num_points * 3);
        }

        if (this.properties.generate_normals) {
            if (!this.normals || this.normals.length !== this.points.length) {
                this.normals = new Float32Array(this.points.length);
            }
        } else {
            this.normals = null;
        }

        const radius = this._last_radius || this.properties.radius;
        const mode = this.properties.mode;

        const obj = this.getInputData(0);
        this._old_obj_version = obj ? obj._version : null;

        this.points = LGraphPoints3D.generatePoints(
            radius,
            num_points,
            mode,
            this.points,
            this.normals,
            this.properties.regular,
            obj
        );

        this.version++;
    }

    static generatePoints(
        radius: number,
        num_points: number,
        mode: number,
        points: Float32Array,
        normals: Float32Array | null,
        regular: boolean,
        obj: any
    ): Float32Array {
        const size = num_points * 3;
        if (!points || points.length !== size) {
            points = new Float32Array(size);
        }

        const temp = new Float32Array(3);
        const UP = new Float32Array([0, 1, 0]);

        if (regular) {
            if (mode === LGraphPoints3D.RECTANGLE) {
                const side = Math.floor(Math.sqrt(num_points));
                for (let i = 0; i < side; ++i) {
                    for (let j = 0; j < side; ++j) {
                        const pos = i * 3 + j * 3 * side;
                        points[pos] = ((i / side) - 0.5) * radius * 2;
                        points[pos + 1] = 0;
                        points[pos + 2] = ((j / side) - 0.5) * radius * 2;
                    }
                }
                points = new Float32Array(points.subarray(0, side * side * 3));
                if (normals) {
                    for (let i = 0; i < normals.length; i += 3) {
                        normals.set(UP, i);
                    }
                }
            } else if (mode === LGraphPoints3D.SPHERE) {
                const side = Math.floor(Math.sqrt(num_points));
                for (let i = 0; i < side; ++i) {
                    for (let j = 0; j < side; ++j) {
                        const pos = i * 3 + j * 3 * side;
                        polarToCartesian(
                            temp,
                            (i / side) * 2 * Math.PI,
                            ((j / side) - 0.5) * 2 * Math.PI,
                            radius
                        );
                        points[pos] = temp[0];
                        points[pos + 1] = temp[1];
                        points[pos + 2] = temp[2];
                    }
                }
                points = new Float32Array(points.subarray(0, side * side * 3));
                if (normals) {
                    LGraphPoints3D.generateSphericalNormals(points, normals);
                }
            } else if (mode === LGraphPoints3D.CIRCLE) {
                for (let i = 0; i < size; i += 3) {
                    const angle = 2 * Math.PI * (i / size);
                    points[i] = Math.cos(angle) * radius;
                    points[i + 1] = 0;
                    points[i + 2] = Math.sin(angle) * radius;
                }
                if (normals) {
                    for (let i = 0; i < normals.length; i += 3) {
                        normals.set(UP, i);
                    }
                }
            }
            // Add other modes here...
        } else {
            switch (mode) {
                case LGraphPoints3D.RECTANGLE:
                    for (let i = 0; i < size; i += 3) {
                        points[i] = (Math.random() - 0.5) * radius * 2;
                        points[i + 1] = 0;
                        points[i + 2] = (Math.random() - 0.5) * radius * 2;
                    }
                    if (normals) {
                        for (let i = 0; i < normals.length; i += 3) {
                            normals.set(UP, i);
                        }
                    }
                    break;
                // Add other modes here...
            }
        }

        return points;
    }

    static generateSphericalNormals(points: Float32Array, normals: Float32Array): void {
        for (let i = 0; i < points.length; i += 3) {
            const x = points[i];
            const y = points[i + 1];
            const z = points[i + 2];
            const length = Math.sqrt(x * x + y * y + z * z);
            normals[i] = x / length;
            normals[i + 1] = y / length;
            normals[i + 2] = z / length;
        }
    }
}

// Helper function to convert polar coordinates to cartesian
function polarToCartesian(out: Float32Array, longitude: number, latitude: number, radius: number): void {
    const sin_lat = Math.sin(latitude);
    out[0] = Math.cos(longitude) * sin_lat * radius;
    out[1] = Math.cos(latitude) * radius;
    out[2] = Math.sin(longitude) * sin_lat * radius;
}

LiteGraph.registerNodeType("geometry/points3D", LGraphPoints3D);

// More geometry nodes will be added here...
