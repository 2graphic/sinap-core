/// DEFINED ELSEWHERE

class Result<T> {
    constructor(value: T){

    }
}

/// END DEFINED ELSEWHERE


export class DFANode {
	/** Accept State */
	isAcceptState: boolean;
	children: DFAEdge[];
}

export class DFAEdge {
	/** Symbol */
	label: string;
	destination: DFANode;
}

export class DFAGraph {
    startState: DFANode;
}

export type Nodes = DFANode
export type Edges = DFAEdge
export type Graph = DFAGraph

export class State {
    constructor(public active: DFANode, public inputLeft: string) {

    }
}

export function start(input: DFAGraph, data: string): State | Result<boolean> {
    return new State(input.startState, data);
}

export function step(current: State): State | Result<boolean> {
    if (current.inputLeft.length === 0){
        return new Result(current.active.isAcceptState);
    }
    const destinations = current.active.children
        .filter(edge => edge.label === current.inputLeft[0])
        .map(edge => edge.destination);

    if (destinations.length == 1) {
        return new State(destinations[0], current.inputLeft.substr(1));
    } else if (destinations.length == 0) {
        return new Result(false);
    } else {
        throw "This is a DFA!";
    }
}