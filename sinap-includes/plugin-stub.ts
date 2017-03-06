import * as plugin from "./plugin";
import { PluginProgram, isError } from "./plugin-program";

interface INode {
    parents: IEdge[];
    children: IEdge[];
    [a: string]: any;
}
interface IEdge {
    source: INode;
    destination: INode;
    [a: string]: any;
}
interface IGraph {
    nodes: INode[];
    edges: IEdge[];
    [a: string]: any;
}

function isNode(a: any, b: string): a is INode {
    return b === "Node";
}
function isEdge(a: any, b: string): a is IEdge {
    return b === "Edge";
}
function isGraph(a: any, b: string): a is IGraph {
    return b === "Graph";
}

type Graph = IGraph & plugin.Graph;
type Node = INode & plugin.Nodes;
type Edge = IEdge & plugin.Edges;

export type SerialJSO = { elements: { kind: string, type: string, data: any }[] };

export function deserialize(pojo: SerialJSO): Graph {
    const elements = pojo.elements.map(e => {
        const type = (plugin as any)[e.type];

        const result = (type ? new type() : {}) as Graph | Node | Edge;
        for (const k of Object.getOwnPropertyNames(e.data)) {
            result[k] = e.data[k];
        }
        return result;
    });

    const traverse = (a: any) => {
        if (typeof (a) !== "object") {
            return;
        }
        for (const k of Object.getOwnPropertyNames(a)) {
            const el = a[k];
            if (el.kind === "sinap-pointer") {
                a[k] = elements[el.index];
            } else {
                traverse(el);
            }
        }
    };

    traverse(elements);

    let graph: Graph = {} as any;
    let edges: Edge[] = [];
    let nodes: Node[] = [];

    for (let i = 0; i < pojo.elements.length; i++) {
        const kind = pojo.elements[i].kind;
        const element = elements[i];
        if (isGraph(element, kind)) {
            graph = element;
        } else if (isNode(element, kind)) {
            nodes.push(element);
            element.parents = [];
            element.children = [];
        } else if (isEdge(element, kind)) {
            edges.push(element);
        }
    }

    for (const edge of edges) {
        edge.source.children.push(edge);
        edge.destination.parents.push(edge);
    }

    graph.nodes = nodes;
    graph.edges = edges;

    return graph;
}

export class Program implements PluginProgram {
    private graph: Graph;
    constructor(graph: SerialJSO) {
        this.graph = deserialize(graph);
    }

    validate() {
        // TODO: improve if plugin defines a validate function
        const res = this.run([""]);
        if (isError(res.result)) {
            return [res.result.message];
        }
        return [];
    }

    run(input: any[]) {
        const states: plugin.State[] = [];
        try {
            let current = (plugin as any).start(this.graph, ...input);
            while (current instanceof plugin.State) {
                states.push(current);
                current = plugin.step(current);
            }
            return {
                states: states,
                result: current,
            };
        } catch (e) {
            const message = e instanceof Error ? e.message : e;
            const stack = e instanceof Error ? e.stack : undefined;
            return {
                result: { message: e.message, stack: stack, kind: "sinap-error" },
                states: states,
            };
        }
    }
}

export class File {
    constructor(public name: string) { }
}

export class Color {
    constructor(public color: string) {
    }
}

export type Point = { x: number, y: number };

export class DrawableNode {
    label: string;
    color: Color;
    position: Point;
    shape: "circle" | "square" | "image";
    image: string;
    anchorPoints: Point[];
    borderColor: Color;
    borderStyle: "solid" | "dotted" | "dashed";
    borderWidth: number;
}

export class DrawableEdge {
    label: string;
    color: Color;
    lineStyle: "solid" | "dotted" | "dashed";
    lineWidth: number;
    source: DrawableNode;
    destination: DrawableNode;
    showSourceArrow: boolean;
    showDestinationArrow: boolean;
}

export class DrawableGraph {
}