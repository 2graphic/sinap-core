import { Type, Value } from "sinap-types";
import { Plugin } from "./plugin";

export type Element = Value.Intersection;

export class Model {
    environment = new Value.Environment();
    constructor(readonly plugin: Plugin) {
        this.graph = new Value.Intersection(this.plugin.graphType, this.environment);
    }

    readonly nodes = new Set<Element>();
    readonly edges = new Set<Element>();
    readonly graph: Element;

    *values() {
        yield this.graph;
        yield* this.nodes;
        yield* this.edges;
    }

    makeNode(type?: Type.Intersection) {
        if (!type) {
            type = this.plugin.nodesType.types.values().next().value as Type.Intersection;
        }
        if (!Type.isSubtype(type, this.plugin.nodesType)) {
            throw new Error("type must be a kind of node");
        }
        const value = new Value.Intersection(type, this.environment);
        this.environment.add(value);
        value.initialize();
        this.nodes.add(value);
        return value;
    }

    makeEdge(type: Type.Intersection | undefined, from: Element, to: Element) {
        if (!type) {
            type = this.plugin.edgesType.types.values().next().value as Type.Intersection;
        }
        if (!Type.isSubtype(type, this.plugin.edgesType)) {
            throw new Error("type must be a kind of edge");
        }
        const value = new Value.Intersection(type, this.environment);
        this.environment.add(value);
        value.initialize();
        value.set("source", from);
        value.set("destination", to);
        this.edges.add(value);
        return value;
    }

    delete(value: Element) {
        if (Type.isSubtype(value.type, this.plugin.nodesType)) {
            this.nodes.delete(value);
            this.collect();
        } else if (Type.isSubtype(value.type, this.plugin.edgesType)) {
            this.edges.delete(value);
            this.collect();
        } else {
            Type.isSubtype(value.type, this.plugin.nodesType);
        }
    }

    collect() {
        this.environment.garbageCollect(this.values());
    }

    serialize() {
        this.collect();
        const otherValues = new Set(this.environment.values.values());
        for (const v of this.values()) {
            otherValues.delete(v);
        }

        const nodes: {[uuid: string]: any} = {};
        for (const node of this.nodes) {
            nodes[node.uuid] = node.serialRepresentation;
        }
        const edges: {[uuid: string]: any} = {};
        for (const edge of this.edges) {
            edges[edge.uuid] = edge.serialRepresentation;
        }
        const others: {[uuid: string]: any} = {};
        for (const other of otherValues) {
            others[other.uuid] = other.serialRepresentation;
        }

        return {
            graph: {[this.graph.uuid]: this.graph.serialRepresentation},
            nodes: nodes,
            edges: edges,
            others: others,
        };
    }
}