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

export type Nodes = DFANode;
export type Edges = DFAEdge;
export type Graph = DFAGraph;

export function interpret(graph: DFAGraph, input: string) {
    let current = graph.startState;

    for (const char of input) {
        // look through all outgoing transitions and get the destinations
        // with matching labels
        const possibleStates = current.children
            .filter(e => e.label === char)
            .map(e => e.destination);
        // no outgoing edges with matching label means the string isn't in the language
        if (possibleStates.length < 1) {
            return false;
        } else if (possibleStates.length === 1) {
            // transisition to the next node
            current = possibleStates[0];
        } else {
            // more than one means that this is an NFA
            throw Error("Not a DFA");
        }
    }
    // check if we ended up in an accept state
    return current.isAcceptState;
}