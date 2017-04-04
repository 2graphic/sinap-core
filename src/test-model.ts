/// <reference path="../typings/index.d.ts" />
import { expect } from "chai";
import { TypescriptPluginLoader } from "sinap-typescript";
import { Value } from "sinap-types";
import { Model, Plugin, getInterpreterInfo } from "./index";
import * as path from "path";

describe("Model", () => {
    const loader = new TypescriptPluginLoader();
    let dfa: Plugin;
    before(() => {
        // TODO: Remove the casts to any once sinap-typescript is updated.
        getInterpreterInfo(path.join("test-support", "dfa")).then((info) => loader.loadPlugin(info.interpreterInfo as any, null as any)).then((plugin) => {
            dfa = plugin as any;
        });
    });

    it("creates simple graph", () => {
        const model = new Model(dfa);
        model.makeNode();
        expect(model.nodes.size).to.equal(1);
        const node = model.nodes.values().next().value;
        expect(node.get("label")).to.be.instanceof(Value.Primitive);
    });

    it("deletes", () => {
        const model = new Model(dfa);
        const node = model.makeNode();
        model.delete(node);
        expect(model.nodes.size).to.equal(0);
    });

    it("serializes simple graph", () => {
        const model = new Model(dfa);
        model.makeNode();
        const raw = model.serialize();
        const node = model.nodes.values().next().value;
        expect(raw).to.deep.equal({
            graph: { [model.graph.uuid]: model.graph.serialRepresentation },
            nodes: { [node.uuid]: node.serialRepresentation },
            edges: {},
            others: {
                [node.get("isAcceptState").uuid]: node.get("isAcceptState").serialRepresentation,
                [node.get("isStartState").uuid]: node.get("isStartState").serialRepresentation,
                [node.get("parents").uuid]: node.get("parents").serialRepresentation,
                [node.get("children").uuid]: node.get("children").serialRepresentation,
                [node.get("label").uuid]: node.get("label").serialRepresentation,
            },
        });
    });
});