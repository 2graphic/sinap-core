/// <reference path="../typings/index.d.ts" />
import { expect } from "chai";
import { TypescriptPluginLoader } from "sinap-typescript";
import { Value } from "sinap-types";
import { PluginLoaderManager, Model, Plugin } from "./index";
import { LocalFileService } from "./test-files-mock";

describe("Model", () => {

    const manager = new PluginLoaderManager();
    manager.loaders.set("typescript", new TypescriptPluginLoader());

    let dfa: Plugin;
    before(() => {
        const fs = new LocalFileService();
        return fs.directoryByName(fs.joinPath("test-support", "dfa"))
            .then((directory) => manager.loadPlugin(directory, fs))
            .then((plugin) => {
                dfa = plugin;
            });
    });


    it("creates simple graph", () => {
        const model = new Model(dfa);
        model.makeNode();
        expect(model.nodes.size).to.equal(1);
        const node = model.nodes.values().next().value;
        expect(node.get("label")).to.be.instanceof(Value.Primitive);
    });

    it("serializes simple graph", () => {
        const model = new Model(dfa);
        model.makeNode();
        const raw = model.serialize();
        const node = model.nodes.values().next().value;
        expect(raw).to.deep.equal({
            graph: {[model.graph.uuid]: model.graph.serialRepresentation},
            nodes: {[node.uuid]: node.serialRepresentation},
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