import * as plugin from "./plugin";
import * as types from "./types-interfaces";

// TODO: consider
export interface FunctionTypeInfo {
    args: types.Type[];
    returnValue: types.Type;
}

interface PropertyObject {
    [propName: string]: any;
}

interface Element extends PropertyObject {
    label: string;
}

interface Node extends Element {
    parents: Edge[];
    children: Edge[];
}

// TODO: Consider capitalization here after typechecker is built.
interface Edge extends Element {
    source: Node;
    destination: Node;
}

function transferProperties(source: any, destination: PropertyObject) {
    const propSet = source.pluginProperties;
    for (const propName in propSet) {
        destination[propName] = propSet[propName];
    }
}

/**
 * This class is the graph presented to the user. For convenience of reading this data structure, there are duplicate
 * and cyclical references. The constructor guarantees that these are consistent, but any changes after construction
 * should be done in a consistent fashion. TODO: Make mutator methods for plugins to utilize once mutation of the graph
 * during interpretation is added.
 */
class Graph implements PropertyObject {
    nodes: Node[];
    edges: Edge[];
    public constructor(serialGraph: any) {

        serialGraph = serialGraph.graph;
        transferProperties(serialGraph, this);

        this.nodes = serialGraph.nodes.map((oldNode: any) => {
            const result: Node = {
                label: oldNode.drawableProperties.Label,
                parents: [],
                children: []
            };
            transferProperties(oldNode, result);
            return result;
        });

        // This seems like duplicate code but I'm not sure how to clean it up and combine it with the code above.
        this.edges = serialGraph.edges.map((oldEdge: any) => {
            const source = this.nodes[oldEdge.source];
            const destination = this.nodes[oldEdge.destination];

            const result: Edge = {
                label: oldEdge.pluginProperties.Symbol,
                source: source,
                destination: destination
            };

            transferProperties(oldEdge, result);

            source.children.push(result);
            destination.parents.push(result);
            return result;
        });
    }
}

export function compile(g: any) {
    // TODO: cleanup, remove any, add try catch
    return plugin.compile(new Graph(g) as any);
}