/// <reference path="../typings/globals/mocha/index.d.ts" />
/// <reference path="../typings/modules/chai/index.d.ts" />
import { loadPluginDir, Plugin, CoreModel, CoreElement, CoreObjectValue, CorePrimitiveValue, valueWrap, FakeIntersectionType, makeValue, isObjectType, CoreElementKind } from "../src/";
import { expect } from 'chai';
import * as path from "path";

function roundTripJSO(plugin: Plugin, jso: any) {
    const jsoString = JSON.stringify(jso);

    const model = new CoreModel(plugin, jso);
    const serializedObject = model.serialize();
    const serialString = JSON.stringify(serializedObject);
    const model2 = new CoreModel(plugin, JSON.parse(serialString));
    const serialString2 = JSON.stringify(model2.serialize());

    expect(JSON.parse(serialString2)).to.deep.equal(JSON.parse(jsoString));
    return model2;
}

describe("Serialization", () => {
    let firstPlugin: Plugin;
    let secondPlugin: Plugin;

    function loadSerPlugin(name: string): Promise<Plugin> {
        return loadPluginDir(path.join("test", "interpreters", "serial", name));
    }

    it("builds", () => {
        expect(firstPlugin.results.diagnostics.global).to.deep.equal([]);
        expect(firstPlugin.results.diagnostics.semantic).to.deep.equal([]);
        expect(firstPlugin.results.diagnostics.syntactic).to.deep.equal([]);
    });


    it("serialize simple object", () => {
        const value = valueWrap(firstPlugin.typeEnvironment, { hello: "world" }, true);
        expect({ hello: "world" }).to.deep.equal(value.jsonify(_ => { return { result: false, value: undefined }; }));
    });

    it("serialize simple ts array", () => {
        const type = firstPlugin.typeEnvironment.lookupSinapType("DrawableNode");
        if (!isObjectType(type)) {
            throw new Error(":(");
        }
        const listType = type.members.get("anchorPoints");
        if (!listType) {
            throw new Error("wat");
        }

        const value = makeValue(listType, undefined, true);
        expect(value.jsonify(_ => { return { result: false, value: undefined }; }))
            .to.deep.equal([]);
    });

    it("serialize ts array", () => {
        const type = firstPlugin.typeEnvironment.lookupSinapType("DrawableNode");
        if (!isObjectType(type)) {
            throw new Error(":(");
        }
        const listType = type.members.get("anchorPoints");
        if (!listType) {
            throw new Error("wat");
        }

        expect(() => makeValue(listType, [1, 2, 3], true)).to.throw();
        const value = makeValue(listType, [{ x: 13, y: 12 }, { x: 1, y: 200 }], true);
        expect(value.jsonify(_ => { return { result: false, value: undefined }; })).to.deep.equal([{ x: 13, y: 12 }, { x: 1, y: 200 }]);
    });

    // it("serialize simple array", () => {
    //     const value = makeValue([], firstPlugin.typeEnvironment, true);
    //     assert.deepEqual([], value.jsonify(_ => { return { result: false, value: undefined }; }));
    // });

    // it("serialize array", () => {
    //     const value = makeValue([1,2,3], firstPlugin.typeEnvironment, true);
    //     assert.deepEqual([1,2,3], value.jsonify(_ => { return { result: false, value: undefined }; }));
    // });

    it("serialize object", () => {
        const value = valueWrap(firstPlugin.typeEnvironment, { hello: "world", you: { are: { going: "down", n: 16 }, y: 12 } }, true);
        const vany = value as any;
        expect(vany.get("you").get("y").data).to.equal(12);
        expect(value.jsonify(_ => { return { result: false, value: undefined }; }))
            .to.deep.equal({
                hello: "world",
                you: { are: { going: "down", n: 16 }, y: 12 }
            });
        vany.get("you").get("y").data = 15;
        expect(value.jsonify(_ => { return { result: false, value: undefined }; }))
            .to.deep.equal({
                hello: "world",
                you: { are: { going: "down", n: 16 }, y: 15 }
            });
    });

    it("serialize intersection", () => {
        const value1 = valueWrap(firstPlugin.typeEnvironment, { hello: "world", you: { are: { going: "down", n: 16 }, y: 12 } }, true);
        const value2 = valueWrap(firstPlugin.typeEnvironment, { smelly: "you" }, true);
        const type1 = value1.type;
        const type2 = value2.type;

        const typeI = new FakeIntersectionType(firstPlugin.typeEnvironment, new Set([type1, type2]));

        const valueI = makeValue(typeI, undefined, true);

        expect(valueI.jsonify(_ => { return { result: false, value: undefined }; }))
            .to.deep.equal({
                hello: "",
                you: { are: { going: "", n: 0 }, y: 0 },
                smelly: ""
            });
    });

    it("serialize coreelement", () => {
        const node = firstPlugin.makeElement(CoreElementKind.Node, "Node1", "hello-fake-uuid-time");

        expect(node.jsonify(_ => { return { result: false, value: undefined }; }))
            .to.deep.equal({
                type: "Node1",
                kind: "Node",
                uuid: "hello-fake-uuid-time",
                data: {
                    a: false,
                    anchorPoints: [],
                    color: "",
                    borderColor: "",
                    borderStyle: "solid",
                    borderWidth: 0,
                    image: "",
                    label: "",
                    position: {
                        x: 0,
                        y: 0,
                    },
                    shape: "circle",
                }
            });
    });


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
            version: "0.0.8",
            elements: [
                {
                    kind: "Graph",
                    type: "Graph1",
                    uuid: "47832-84-82344",
                    data: {
                        startState: { kind: "sinap-pointer", uuid: "453485-5432123-4237432" },
                    },
                },
                {
                    kind: "Node",
                    type: "Node1",
                    uuid: "453485-5432123-4237432",
                    data: {
                        a: true,
                        "anchorPoints": [],
                        "borderColor": "",
                        "borderStyle": "solid",
                        "borderWidth": 0,
                        "color": "",
                        "image": "",
                        "label": "",
                        "position": {
                            "x": 0,
                            "y": 0
                        },
                        "shape": "circle",
                    },
                },
            ]
        });

        const startState = test.elements.get("47832-84-82344")!.get("startState");
        if (!(startState instanceof CoreElement)) {
            throw new Error("! (startState instanceof CoreObjectValue)");
        }
        const a = startState.get("a");
        if (!(a instanceof CorePrimitiveValue)) {
            throw new Error("! (a instanceof CorePrimitiveValue)");
        }

        expect(a.data).to.be.true;
    });

    it("two", () => {
        const test = roundTripJSO(secondPlugin, {
            format: "sinap-file-format",
            kind: ["test"],
            version: "0.0.8",
            elements: [
                {
                    kind: "Graph",
                    type: "Graph1",
                    uuid: "hj312kj43h2-4kj23-4jk23",
                    data: {
                        startState: { kind: "sinap-pointer", uuid: "1932839102384237423423" },
                    },
                },
                {
                    kind: "Node",
                    type: "Node1",
                    uuid: "1932839102384237423423",
                    data: {
                        a: true,
                        "anchorPoints": [{ x: 12, y: 15 }],
                        "borderColor": "red",
                        "borderStyle": "solid",
                        "borderWidth": 3,
                        "color": "red",
                        "image": "",
                        "label": "hi",
                        "position": {
                            "x": 15,
                            "y": 17
                        },
                        "shape": "square",
                    },
                },
                {
                    kind: "Node",
                    type: "Node2",
                    uuid: "hsfkjdfhj skdfhjs dkf s",
                    data: {
                        b: {
                            n: { kind: "sinap-pointer", uuid: "1932839102384237423423" },
                        },
                        "anchorPoints": [],
                        "borderColor": "",
                        "borderStyle": "solid",
                        "borderWidth": 0,
                        "color": "",
                        "image": "",
                        "label": "",
                        "position": {
                            "x": 0,
                            "y": 0
                        },
                        "shape": "circle",
                    },
                },
            ]
        });

        const startState = test.elements.get("hsfkjdfhj skdfhjs dkf s");

        if (!(startState instanceof CoreElement)) {
            throw new Error("start state is not an element");
        }

        const node2anon = startState.get("b");
        if (!(node2anon instanceof CoreObjectValue)) {
            throw new Error("node2anon is not an CoreObjectValue");
        }

        const node1 = node2anon.get("n");
        if (!(node1 instanceof CoreElement)) {
            throw new Error("node1 is not an element");
        }

        const a = node1.get("a");
        if (!(a instanceof CorePrimitiveValue)) {
            throw new Error("!(a instanceof CorePrimitiveValue)");
        }

        expect(a.data).to.be.true;
        expect(node1.get("a").type).to.equal(secondPlugin.typeEnvironment.getBooleanType());
    });
});