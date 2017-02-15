/// <reference path="../typings/globals/mocha/index.d.ts" />
import { loadPlugin, Plugin, CoreModel } from "../src/";
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
    it("one", () => {
        const test = roundTripJSO(loadPlugin("test/definitions.ts"), {
            format: "sinap-file-format",
            kind: "TODO: implement this",
            version: "0.0.6",
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

        assert.equal(true, test.elements[0].data['startState'].data.a);
    });

    it("two", () => {
        const test = roundTripJSO(loadPlugin("test/definitions-for-serial.ts"), {
            format: "sinap-file-format",
            kind: "TODO: implement this",
            version: "0.0.6",
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

        assert.equal(true, test.elements[0].data['startState'].data.b.n.data.a);
    });
});