/// <reference path="../typings/globals/mocha/index.d.ts" />

import * as assert from "assert";
import { validateEdge, WrappedScriptObjectType, loadPluginDir, Plugin } from "../src/";
import { LocalFileService } from "./files-mock";

describe("isValidEdge", () => {
    const fs = new LocalFileService();
    function loadTestPlugin(name: string, dirs = ["test", "interpreters"]): Promise<Plugin> {
        return fs.directoryByName(fs.joinPath(...dirs.concat([name])))
            .then((directory) => loadPluginDir(directory, fs));
    }

    const plugin = loadTestPlugin("validation");

    it("map edges", () => {
        return plugin.then(plugin => {
            const node1 = plugin.typeEnvironment.lookupPluginType("Node1") as WrappedScriptObjectType;
            const node2 = plugin.typeEnvironment.lookupPluginType("Node2") as WrappedScriptObjectType;
            const node3 = plugin.typeEnvironment.lookupPluginType("Node3") as WrappedScriptObjectType;
            const edge1 = plugin.typeEnvironment.lookupPluginType("Edge1") as WrappedScriptObjectType;
            const edge2 = plugin.typeEnvironment.lookupPluginType("Edge2") as WrappedScriptObjectType;

            assert.equal(true, validateEdge(edge1, node1, node2));
            assert.equal(false, validateEdge(edge1, node1, node3));
            assert.equal(true, validateEdge(edge1, node1, node2));
            assert.equal(false, validateEdge(edge2, node1, node2));
        });
    });
});