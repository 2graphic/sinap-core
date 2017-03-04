/// <reference path="../typings/globals/mocha/index.d.ts" />
/// <reference path="../typings/modules/chai/index.d.ts" />

import { validateEdge, WrappedScriptObjectType, loadPluginDir, Plugin, PluginTypeEnvironment } from "../src/";
import { LocalFileService } from "./files-mock";
import { expect } from "chai";

describe("isValidEdge", () => {
    const fs = new LocalFileService();
    function loadTestPlugin(name: string, dirs = ["test", "interpreters"]): Promise<Plugin> {
        return fs.directoryByName(fs.joinPath(...dirs.concat([name])))
            .then((directory) => loadPluginDir(directory, fs));
    }

    const plugin = loadTestPlugin("validation");

    it("map edges", () => {
        return plugin.then(plugin => {
            const node1 = plugin.typeEnvironment.lookupPluginType("Node1") as WrappedScriptObjectType<PluginTypeEnvironment>;
            const node2 = plugin.typeEnvironment.lookupPluginType("Node2") as WrappedScriptObjectType<PluginTypeEnvironment>;
            const node3 = plugin.typeEnvironment.lookupPluginType("Node3") as WrappedScriptObjectType<PluginTypeEnvironment>;
            const edge1 = plugin.typeEnvironment.lookupPluginType("Edge1") as WrappedScriptObjectType<PluginTypeEnvironment>;
            const edge2 = plugin.typeEnvironment.lookupPluginType("Edge2") as WrappedScriptObjectType<PluginTypeEnvironment>;

            expect(validateEdge(edge1, node1, node2)).to.equal(true);
            expect(validateEdge(edge1, node1, node3)).to.equal(false);
            expect(validateEdge(edge1, node1, node2)).to.equal(true);
            expect(validateEdge(edge2, node1, node2)).to.equal(false);
        });
    });
});