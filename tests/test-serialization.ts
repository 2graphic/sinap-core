import { loadPlugin, Plugin, CoreModel } from "../src/index";

function roundTripJSO(plugin: Plugin, jso: any){
    const jsoString = JSON.stringify(jso);

    const model = new CoreModel(plugin, jso);
    const serialString = JSON.stringify(model.serialize());
    const model2 = new CoreModel(loadPlugin("tests/definitions.ts"), JSON.parse(serialString));
    const serialString2 = JSON.stringify(model2.serialize());

    console.log("checking roundtrip equal", serialString2 === jsoString);
    return model2;
}

export function run(){
    console.log("Testing serialization/deserialization");

    const test1 = roundTripJSO(loadPlugin("tests/definitions.ts"), {
        format: "sinap-file-format",
        kind: "TODO: implement this",
        version: "0.0.6",
        elements: [
            {
                kind: "Graph",
                type: "Graph1",
                data: {
                    startState: {kind: "sinap-pointer", index: 1},
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

    console.log("checking integrity 1: ", test1.elements[0].data['startState'].data.a === true);

    const test2 = roundTripJSO(loadPlugin("tests/definitions-for-serial.ts"), {
        format: "sinap-file-format",
        kind: "TODO: implement this",
        version: "0.0.6",
        elements: [
            {
                kind: "Graph",
                type: "Graph1",
                data: {
                    startState: {kind: "sinap-pointer", index: 2},
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
                        n: {kind: "sinap-pointer", index: 1},
                    },
                },
            },
        ]
    });

    console.log("checking integrity 2: ", test2.elements[0].data['startState'].data.b.n.data.a === true);
}