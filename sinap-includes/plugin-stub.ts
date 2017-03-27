import * as plugin from "./plugin";
import { PluginProgram, isError, SerialJSO } from "./plugin-program";

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

function isNode(a: any, b: string): a is NodeT {
    return b === "Node";
}
function isEdge(a: any, b: string): a is EdgeT {
    return b === "Edge";
}
function isGraph(a: any, b: string): a is GraphT {
    return b === "Graph";
}

type GraphT = IGraph & plugin.Graph;
type NodeT = INode & plugin.Nodes;
type EdgeT = IEdge & plugin.Edges;

function traverse(a: any, elements: Map<string, NodeT | EdgeT | GraphT>) {
    if (typeof (a) !== "object") {
        return;
    }
    for (const k of Object.getOwnPropertyNames(a)) {
        const el = a[k];
        if (el.kind === "custom-object") {
            if (el.type === "Map") {
                traverse(el.members, elements);
                a[k] = new Map(el.members);
            } else {
                throw new Error("unknown custom object");
            }
        } else if (el.kind === "sinap-pointer") {
            a[k] = elements.get(el.uuid)!;
        } else {
            traverse(el, elements);
        }
    }
};

export function deserialize(pojo: SerialJSO) {
    const elements = new Map(pojo.elements.map(e => {
        const type = (plugin as any)[e.type];
        const result = (type ? new type() : {}) as GraphT | NodeT | EdgeT;
        Object.assign(result, e.data);
        (result as any).sinapUniqueIdentifier = e.uuid;
        return [e.uuid, result] as [string, GraphT | NodeT | EdgeT];
    }));

    for (const element of elements.values()) {
        traverse(element, elements);
    }

    let graph: GraphT = {} as any;
    let edges: EdgeT[] = [];
    let nodes: NodeT[] = [];

    for (let i = 0; i < pojo.elements.length; i++) {
        const kind = pojo.elements[i].kind;
        const element = elements.get(pojo.elements[i].uuid)!;
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

    return [graph, elements] as [GraphT, Map<string, NodeT | EdgeT | GraphT>];
}

function encodeResult(a: any, types: string[]) {
    return JSON.parse(
        JSON.stringify(
            a,
            (key, value) => {
                for (const type of types) {
                    if (value instanceof (plugin as any)[type]) {
                        return { kind: "sinap-pointer", uuid: value.sinapUniqueIdentifier };
                    }
                }
                return value;
            }
        )
    );
}

export class Program implements PluginProgram {
    private graph: GraphT;
    private elements: Map<string, NodeT | EdgeT | GraphT>;
    private elementTypeNameList: string[];
    constructor(graph: SerialJSO, private elementTypeNames: { nodes: string[], edges: string[], graph: string }) {
        [this.graph, this.elements] = deserialize(graph);
        this.elementTypeNameList = elementTypeNames.nodes.concat(elementTypeNames.edges, [elementTypeNames.graph]);
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
            traverse(input, this.elements);
            let current = (plugin as any).start(this.graph, ...input);
            while (current instanceof plugin.State) {
                states.push(encodeResult(current, this.elementTypeNameList));
                current = plugin.step(current);
            }
            return {
                states: states,
                result: encodeResult(current, this.elementTypeNameList),
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

export type SinapError = { message: string, stack: string, kind: "sinap-error" };
export type PluginElement = plugin.Nodes | plugin.Edges | plugin.Graph;
export type Nodes = plugin.Nodes & DrawableNode;
export type Edges = plugin.Edges & DrawableEdge;
export type Graph = plugin.Graph & DrawableGraph;

export class WrappedString {
    kind: "sinap-wrapped-string";
    constructor(public str: string) { }
}

export class File extends WrappedString {
}

export class Color extends WrappedString {
}

export type Point = { x: number, y: number };

export class DrawableNode {
    label: string;
    color: Color;
    position: Point;
    shape: "circle" | "square" | "image";
    image: File;
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
    sourcePoint: Point;
    destinationPoint: Point;
}

export class DrawableGraph {
}