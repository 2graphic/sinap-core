/// <reference path="../typings/index.d.ts" />
import { expect } from "chai";
import { ExamplePlugin } from "./test-custom-loader";
import { Value } from "sinap-types";
import { Model, Plugin, getInterpreterInfo } from "./index";
import * as path from "path";
import { PluginLoader, InterpreterInfo } from "./plugin-loader";

describe("Model", () => {
    const loader: PluginLoader = {
        load: (pluginInfo: InterpreterInfo) => {
            return Promise.resolve(new ExamplePlugin(pluginInfo));
        },
        name: "example"
    };

    let examplePlugin: Plugin;
    before(() => {
        return getInterpreterInfo(path.join("test-support", "dfa")).then((info) => loader.load(info.interpreterInfo)).then((plugin) => {
            examplePlugin = plugin;
        });
    });

    it("creates simple graph", () => {
        const model = new Model(examplePlugin);
        model.makeNode();
        expect(model.nodes.size).to.equal(1);
        const node = model.nodes.values().next().value;
        expect(node.get("label")).to.be.instanceof(Value.Primitive);
    });

    it("deletes", () => {
        const model = new Model(examplePlugin);
        const node = model.makeNode();
        model.delete(node);
        expect(model.nodes.size).to.equal(0);
    });

    it("serializes simple graph", () => {
        const model = new Model(examplePlugin);
        model.makeNode();
        const raw = model.serialize();
        const node = model.nodes.values().next().value;
        expect(raw).to.deep.equal({
            graph: { [model.graph.uuid]: model.graph.serialRepresentation },
            nodes: { [node.uuid]: node.serialRepresentation },
            edges: {},
            others: {
                [node.get("parents").uuid]: node.get("parents").serialRepresentation,
                [node.get("children").uuid]: node.get("children").serialRepresentation,
                [node.get("label").uuid]: node.get("label").serialRepresentation,
            },
        });
    });
});