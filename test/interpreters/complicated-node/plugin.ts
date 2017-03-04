export class ComplexNode {
    blah: {foo: {bar: {woooo: number}}};
}

export class ComplexEdge {
    // TODO: this can't be empty because it shouldn't be assignable from most things.
    kind: "Edge";
}

export class ComplexGraph {
    startState: ComplexNode;
}

export type Nodes = ComplexNode;
export type Edges = ComplexEdge;
export type Graph = ComplexGraph;

export class State {
}

export function start(input: ComplexGraph, data: string): number {
    return input.startState.blah.foo.bar.woooo;
}

export function step(a: any) {}