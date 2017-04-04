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
                [node.get("label").uuid]: node.get("label").serialRepresentation,
                [node.get("color").uuid]: node.get("color").serialRepresentation,
                [node.get("position").uuid]: node.get("position").serialRepresentation,
                [node.get("shape").uuid]: node.get("shape").serialRepresentation,
                [node.get("image").uuid]: node.get("image").serialRepresentation,
                [node.get("anchorPoints").uuid]: node.get("anchorPoints").serialRepresentation,
                [node.get("borderColor").uuid]: node.get("borderColor").serialRepresentation,
                [node.get("borderStyle").uuid]: node.get("borderStyle").serialRepresentation,
                [node.get("borderWidth").uuid]: node.get("borderWidth").serialRepresentation,
                [(node.get("position") as Value.Record).value.x.uuid]: (node.get("position") as Value.Record).value.x.serialRepresentation,
                [(node.get("position") as Value.Record).value.y.uuid]: (node.get("position") as Value.Record).value.y.serialRepresentation,
                [(node.get("shape") as Value.Union).value.uuid]: (node.get("shape") as Value.Union).value.serialRepresentation,
                [(node.get("borderStyle") as Value.Union).value.uuid]: (node.get("borderStyle") as Value.Union).value.serialRepresentation,
            },
        });
    });
});