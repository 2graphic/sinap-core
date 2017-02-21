[![Build Status](https://travis-ci.org/2graphic/sinap-core.svg?branch=master)](https://travis-ci.org/2graphic/sinap-core)

# Building

Make sure you have npm installed. 
Build:

    npm install
    npm run typings
    npm run build

And test:

    npm test


# Sinap Plugins

## Setting Up a Plugin Build

Plugins in Sinap are directory based and utilize a package.json as seen with NPM. While dependency resolution is not currently supported, in the future, Sinap will install dependencies with --ignore-scripts.

Currently, the only information that Sinap looks at in the package.json is in a sinap object, i.e.

```json
{
    "sinap": {
        "kind": ["Formal Languages", "DFA"],
        "plugin-file": "plugin.ts"
    }
}
```

sinap.kind is a hierarchical description of the plugin that must be unique for each plugin. It is intended to allow for easy conceptual grouping of related plugins and should not be used for long, elaborate names such as Java namespaces.

sinap.plugin-file is the typescript file within the directory of the package.json which is the entry point for the plugin. Plugins may import other files within this directory (including from node_modules) which Sinap will resolve at runtime.

## Plugin Typescript DSL Description

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
