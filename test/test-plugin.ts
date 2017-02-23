/// <reference path="../typings/globals/mocha/index.d.ts" />
import { loadPluginDir, Plugin } from "../src/";
import { LocalFileService } from "./files-mock";
import * as assert from "assert";

describe("plugin", () => {
    const fs = new LocalFileService();
    function loadTestPlugin(name: string, dirs = ['interpreters']): Promise<Plugin> {
        return fs.directoryByName(fs.joinPath(...dirs.concat([name])))
            .then((directory) => loadPluginDir(directory, fs));
    }

    it("loading", () => {
        return loadTestPlugin("dfa");
    });

    it("provides start type info", () => {
        return loadTestPlugin("dfa").then(plugin => {
            const ts = plugin.typeEnvironment.startTypes.map(m => [m[0].map(n => n.name), m[1].name]);
            assert.deepEqual([[['DFAGraph', 'string'], 'boolean | State']], ts);
        });
    });

    it("handles overloads", () => {
        return loadTestPlugin("start-functions", ['test', 'interpreters']).then(plugin => {
            const ts = plugin.typeEnvironment.startTypes.map(m => [m[0].map(n => n.name), m[1].name]);
            assert.deepEqual([[['number', 'number'], 'number'], [['string', 'string'], 'string'],], ts);
        });
    });
});
