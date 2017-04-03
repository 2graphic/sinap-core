import { Type, Value } from "sinap-types";
import { Plugin } from "./plugin";

export class Model {
    environment = new Value.Environment();
    constructor(readonly plugin: Plugin) {
        this.graph = new Value.Intersection(this.plugin.graphType, this.environment);
    }

    readonly nodes = new Set<Value.Intersection>();
    readonly edges = new Set<Value.Intersection>();
    readonly graph: Value.Intersection;

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

    makeEdge(type: Type.Intersection | undefined, from: Value.Intersection, to: Value.Intersection) {
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

    delete(value: Value.Intersection) {
        if (Type.isSubtype(value.type, this.plugin.nodesType)) {
            this.nodes.delete(value);
            this.collect();
        } else if (Type.isSubtype(value.type, this.plugin.edgesType)) {
            this.edges.delete(value);
            this.collect();
        }
        throw new Error("can't delete value, not a node or edge");
    }

    collect() {
        this.environment.garbageCollect(this.values());
    }
}