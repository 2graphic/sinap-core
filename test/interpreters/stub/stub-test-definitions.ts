export class Node {
    a: number;
    b: Node;
    parents: Edge[];
}
export class Edge {
    source: Node;
    destination: Node;
}
export class GraphC {
    nodes: Node[];
}

export type Nodes = Node;
export type Edges = Edge;
export type Graph = GraphC;

export function doIt() {
    return "Did it";
}

export class State {
    n: Node;
}

export function start(a: Graph, num: number): number | State {
    const s = new State();
    s.n = a.nodes.filter((n) => n.a === num)[0];
    return s;
}

export function step(s: State): number | State {
    return s.n.parents[0].source.a;
}