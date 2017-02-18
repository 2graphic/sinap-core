[![Build Status](https://travis-ci.org/2graphic/sinap-core.svg?branch=master)](https://travis-ci.org/2graphic/sinap-core)

# Sinap Plugins

Sinap is an IDE and a framework for interpreters. A plugin fills in the blanks to make a complete IDE interpreter. At the bare minimum, a plugin my provide:

 - Type information. This tells sinap what constitutes a valid graph so that sinap can allow users to generate valid graphs and feed them to the interpreter. 
 - The interpreter. This allows sinap to actually run the graph

This information is provided in a single typescript file. A plugin must export:

 - Types of valid nodes and edges
  - a `Graph` type
   - may have a `nodes` field and/or an `edges` field
   - if so it must be assignable from `Nodes[]` and `Edges[]` respectively
  - a `Nodes` type
   - may be a union of types
   - each member of the union:
    - may have a `children` field and/or a `parents` field
    - if so those fields must be assignable to `Edges[]`
  - an `Edges` type
   - may be a union of types
   - each member of the union:
    - may have a `source` field and/or a `destination` field
    - if so those fields must be assignable to `Node`

An example of a valid types portion of a plugin follows:

```ts
export class Graph {
    nodes: Nodes[];
    favorite: NodeB;
}

export type Nodes = NodeA | NodeB;

export class NodeA {
    magnet: boolean;
    children: EdgeA[]; // constrains that NodeA -- EdgeA --> any
}

export class NodeB {
    likesFaries: boolean;
    parents: EdgeA[]; // constrains that any -- EdgeA --> NodeB
}

export type Edges = EdgeA | EdgeB;

export class EdgeA {
}

export class EdgeB {
    source: NodeB; // constrains that NodeB -- EdgeB --> any
}
```

For an edge to be valid, it must match all the applicable constraints. 

For the interpreter section, the file must export:

```ts
export class State {
    // anything here
}
export function start(g: Graph, ...): State | results
export function step(state: State): State | results
```

Where the state class can have any values you choose, start can specify any arguments you want after the `Graph` and results can be your choice of type. 
