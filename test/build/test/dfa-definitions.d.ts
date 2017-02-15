export declare class DFANode {
    isAcceptState: boolean;
    children: DFAEdge[];
}
export declare class DFAEdge {
    label: string;
    destination: DFANode;
}
export declare class DFAGraph {
    startState: DFANode;
}
export declare type Nodes = DFANode;
export declare type Edges = DFAEdge;
export declare type Graph = DFAGraph;
export declare function interpret(graph: DFAGraph, input: string): boolean;
