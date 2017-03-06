export class Node1 {
    a: boolean;
}

export class Node2 {
    b: {
        n: Node1
    };
}

export class Edge1 {
    label: string;
    destination: Node1 | Node2;
}

export class Graph1 {
    startState: Node1 | Node2;
}

export type Nodes = Node1 | Node2;
export type Edges = Edge1;
export type Graph = Graph1;

export function start() {

}
export function step(a: any) { }