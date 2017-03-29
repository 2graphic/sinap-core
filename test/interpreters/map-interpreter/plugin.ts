export class Nodes {
    k: "nodes";
}

export class Edges {
    k: "edges";
}

export class Graph {
    nodes: Nodes[];
}

export class State {
    m = new Map<number, string>([[17, "hi"]]);
    constructor(public message: string,
        public data: boolean
    ) {

    }
}

export type M1 = Map<string, number>;

declare let console: {log(...a: any[]): any};

export function start(input: Graph, data: Map<Nodes, boolean>, num: number): State | boolean {
    return new State("starting", data.get(input.nodes[num])!);
}

export function step(current: State): State | boolean {
    return current.data;
}