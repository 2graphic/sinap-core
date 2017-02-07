/**
 * @file Provides an example plugin
 * @name ExampleInterpreter
 * @kind example.plugin.sinap-kind
 */


/**
 * This file never actually gets loaded. It's a demo file for intellisense in plugin stub.
 * It is also a demo for plugin developers. 
 */
export class ExGraph {
    // TODO: consider how to verify this type
    nodes: ExNode[];
}
export class ExNode {
    parents: ExEdge[];
    children: ExEdge[];
}
export class ExEdge {
    source: ExNode;
    destination: ExNode;
}

export type Graph = ExGraph;
export type Nodes = ExNode;
export type Edges = ExEdge;

/**
 * A real plugin will have a narrower signature than this. 
 * That information will be introspected at plugin compile time
 * and passed to the stub. 
 * 
 * TODO: Implement this
 */
export function compile(...args: any[]): any {

}