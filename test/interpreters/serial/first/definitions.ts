export class Character { }

export class Node1 {
    a: boolean;
}

export class Node2 {
    parents: Edge1[];
    b: boolean;
}

export class Node3 {
    c: boolean;
}

export class Edge1 {
    /** Symbol */
    label: Character;
    destination: Node1 | Node2;
}

export class Edge2 {
    source: Node1 | Node2;
}

export class Graph1 {
    startState: Node1;
}

export class State {}

export type Nodes = Node1 | Node2 | Node3;
export type Edges = Edge1 | Edge2;
export type Graph = Graph1;

export function start() { }
export function step(a: any) { }