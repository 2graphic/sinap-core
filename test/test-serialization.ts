/// <reference path="../typings/globals/mocha/index.d.ts" />
import { loadPluginDir, Plugin, CoreModel, CoreObjectValue } from "../src/";
import { LocalFileService } from "./files-mock";
import * as assert from "assert";

function roundTripJSO(plugin: Plugin, jso: any) {
    const jsoString = JSON.stringify(jso);

    const model = new CoreModel(plugin, jso);
    const serialString = JSON.stringify(model.serialize());
    const model2 = new CoreModel(plugin, JSON.parse(serialString));
    const serialString2 = JSON.stringify(model2.serialize());

    assert.equal(serialString2, jsoString, "checking roundtrip equal");
    return model2;
}

describe("Serialization", () => {
    let firstPlugin: Plugin;
    let secondPlugin: Plugin;

    const fs = new LocalFileService();
    function loadSerPlugin(name: string): Promise<Plugin> {
        return fs.directoryByName(fs.joinPath("test", "interpreters", "serial", name))
            .then((directory) => loadPluginDir(directory, fs));
    }

    before(() => {
        return Promise.all([loadSerPlugin("first"), loadSerPlugin("second")])
            .then(([first, second]) => {
                firstPlugin = first;
                secondPlugin = second;
            });
    });

    it("one", () => {
        const test = roundTripJSO(firstPlugin, {
            format: "sinap-file-format",
            kind: ["test"],
            version: "0.0.7",
            elements: [
                {
                    kind: "Graph",
                    type: "Graph1",
                    data: {
                        startState: { kind: "sinap-pointer", index: 1 },
                    },
                },
                {
                    kind: "Node",
                    type: "Node1",
                    data: {
                        a: true,
                    },
                },
            ]
        });

        assert.equal(true, test.elements[0].value["startState"].value.a.value);
    });

    it("two", () => {
        const test = roundTripJSO(secondPlugin, {
            format: "sinap-file-format",
            kind: ["test"],
            version: "0.0.7",
            elements: [
                {
                    kind: "Graph",
                    type: "Graph1",
                    data: {
                        startState: { kind: "sinap-pointer", index: 2 },
                    },
                },
                {
                    kind: "Node",
                    type: "Node1",
                    data: {
                        a: true,
                    },
                },
                {
                    kind: "Node",
                    type: "Node2",
                    data: {
                        b: {
                            n: { kind: "sinap-pointer", index: 1 },
                        },
                    },
                },
            ]
        });

        const startState = test.elements[0].value.startState;

        if (!(startState instanceof CoreObjectValue)) {
            throw new Error("start state is not an element");
        }

        const node2anon = startState.value.b;
        if (!(node2anon instanceof CoreObjectValue)) {
            throw new Error("node2anon is not an CoreObjectValue");
        }

        const node1 = node2anon.value.n;
        if (!(node1 instanceof CoreObjectValue)) {
            throw new Error("node1 is not an element");
        }

        assert.equal(true, node1.value.a.value);
        assert.equal(secondPlugin.typeEnvironment.getBooleanType(), node1.value.a.type);
        assert.equal(true, test.elements[0].value.startState.value.b.value.n.value.a.value);
    });
});