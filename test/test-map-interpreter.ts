/// <reference path="../typings/globals/mocha/index.d.ts" />
/// <reference path="../typings/modules/chai/index.d.ts" />

import { expect } from "chai";
import {
    loadPluginDir,
    CoreModel,
    Plugin,
    makeValue,
    Program,
    CoreMapValue,
    PluginTypeEnvironment,
} from "../src/";
import { LocalFileService } from "./files-mock";
import * as vm from "vm";

describe("various interpreters", () => {
    function setupTest(plugin: Plugin) {
        const script = new vm.Script(plugin.results.js as string);


        const sandbox: any = { console: console, global: {} };
        const context = vm.createContext(sandbox);
        script.runInContext(context);
        return context as any;
    }

    const fs = new LocalFileService();
    function loadTestPlugin(name: string): Promise<Plugin> {
        return fs.directoryByName(fs.joinPath("test", "interpreters", name))
            .then((directory) => loadPluginDir(directory, fs));
    }

    describe("map", () => {
        let plugin: Plugin;
        before((done) => {
            loadTestPlugin("map-interpreter").then((pluginPlugin) => {
                plugin = pluginPlugin;
                done();
            });
        });
        it("compiles", () => {
            expect(plugin.results.diagnostics).to.deep.equal({
                semantic: [],
                syntactic: [],
                global: [],
            });
        });
        it("runs", () => {
            const model = new CoreModel(plugin, {
                format: "sinap-file-format",
                kind: ["Test", "Map"],
                version: "0.0.8",
                elements: [
                    {
                        kind: "Graph",
                        type: "Graph",
                        uuid: "0",
                        data: {
                        },
                    },
                    {
                        kind: "Node",
                        type: "Nodes",
                        uuid: "1",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "Nodes",
                        uuid: "2",
                        data: {
                        }
                    },
                ]
            });

            const context = setupTest(plugin);
            const prog = new Program(model, context.global["plugin-stub"].Program);

            const mapValue = makeValue(prog.runArguments[0][0], new Map(), false) as CoreMapValue<PluginTypeEnvironment>;
            mapValue.map.set(model.elements.get("1")!, makeValue(plugin.typeEnvironment, true, false));
            mapValue.map.set(model.elements.get("2")!, makeValue(plugin.typeEnvironment, false, false));

            {
                const results = prog.run([
                    mapValue,
                    makeValue(prog.runArguments[0][1], 0, true)
                ]);
                expect(results.result.jsonify(() => { return { result: false, value: undefined }; })).to.equal(true);
            }
            {
                const results = prog.run([
                    mapValue,
                    makeValue(prog.runArguments[0][1], 1, true)
                ]);
                expect(results.result.jsonify(() => { return { result: false, value: undefined }; })).to.equal(false);
            }
        });
    });
});