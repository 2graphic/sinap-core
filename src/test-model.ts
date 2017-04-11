import { expect } from "chai";
import { ExamplePlugin } from "./test-custom-loader";
import { Value, Type } from "sinap-types";
import { Model, Plugin, getInterpreterInfo } from "./index";
import * as path from "path";
import { PluginInfo } from "./plugin-loader";
import { pluginTypes } from "./model";
import { ifilter } from "sinap-types/lib/util";

describe("Model", () => {
    let examplePlugin: Plugin;
    let pluginInfo: PluginInfo;
    before(() => {
        return getInterpreterInfo(path.join("test-support", "dfa")).then((info) => {
            pluginInfo = info;
        }).then(() => {
            examplePlugin = new ExamplePlugin(pluginInfo, [['hello', new Type.Primitive("string")]]);
        });
    });

    it("creates simple graph", () => {
        const model = new Model(examplePlugin);
        model.makeNode();
        expect(model.nodes.size).to.equal(1);
        const node = model.nodes.values().next().value;
        expect(node.get("label")).to.be.instanceof(Value.Primitive);
    });

    it("creates edge graph", () => {
        const model = new Model(examplePlugin);
        const n1 = model.makeNode();
        const n2 = model.makeNode();
        expect(model.nodes.size).to.equal(2);
        const e1 = model.makeEdge(undefined, n1, n2);
        expect(model.edges.size).to.equal(1);
        expect((e1.get("source") as Value.Union).value).to.equal(n1);
        expect((e1.get("destination") as Value.Union).value).to.equal(n2);
    });

    it("deletes", () => {
        const model = new Model(examplePlugin);
        const node = model.makeNode();
        model.delete(node);
        expect(model.nodes.size).to.equal(0);
    });

    it("canonicalizes types", () => {
        // dangerous and unstable?
        const { toName, toType } = pluginTypes(examplePlugin);
        expect(toType("string").equals(new Type.Primitive("string"))).to.be.true;
        expect(toType(toName(examplePlugin.types.graph))).to.equal(examplePlugin.types.graph);
        expect(toType(toName(examplePlugin.types.nodes))).to.equal(examplePlugin.types.nodes);
    });

    it("serializes simple graph", () => {
        const model = new Model(examplePlugin);
        model.makeNode();
        const raw = model.serialize();
        const node = model.nodes.values().next().value;
        const { toName } = pluginTypes(examplePlugin);
        expect(raw).to.deep.equal({
            graph: {
                [model.graph.uuid]: {
                    type: "Graph & DrawableGraph",
                    rep: model.graph.serialRepresentation
                }
            },
            nodes: {
                [node.uuid]: {
                    type: "(Node & DrawableNode)[1]",
                    rep: node.serialRepresentation
                }
            },
            edges: {},
            others: {
                [node.get("parents").uuid]: {
                    type: toName(node.get("parents").type),
                    rep: node.get("parents").serialRepresentation
                },
                [node.get("children").uuid]: {
                    type: toName(node.get("children").type),
                    rep: node.get("children").serialRepresentation
                },
                [node.get("label").uuid]: {
                    type: "string",
                    rep: node.get("label").serialRepresentation
                },
                [node.get("color").uuid]: {
                    type: "color",
                    rep: node.get("color").serialRepresentation
                },
                [node.get("position").uuid]: {
                    type: "Point",
                    rep: node.get("position").serialRepresentation
                },
                [node.get("shape").uuid]: {
                    type: '"circle" | "square" | "ellipse" | "rectangle" | "image"',
                    rep: node.get("shape").serialRepresentation
                },
                [(node.get("shape") as Value.Union).value.uuid]: {
                    type: '"circle"',
                    rep: (node.get("shape") as Value.Union).value.serialRepresentation
                },
                [node.get("image").uuid]: {
                    type: "file",
                    rep: node.get("image").serialRepresentation
                },
                [node.get("anchorPoints").uuid]: {
                    type: "(Array)[1]",
                    rep: node.get("anchorPoints").serialRepresentation
                },
                [node.get("borderColor").uuid]: {
                    type: "color",
                    rep: node.get("borderColor").serialRepresentation
                },
                [node.get("borderStyle").uuid]: {
                    type: '"solid" | "dotted" | "dashed"',
                    rep: node.get("borderStyle").serialRepresentation,
                },
                [(node.get("borderStyle") as Value.Union).value.uuid]: {
                    type: '"solid"',
                    rep: (node.get("borderStyle") as Value.Union).value.serialRepresentation,
                },
                [node.get("borderWidth").uuid]: {
                    type: "number",
                    rep: node.get("borderWidth").serialRepresentation,
                },
                [(node.get("position") as Value.Record).value.x.uuid]: {
                    type: "number",
                    rep: (node.get("position") as Value.Record).value.x.serialRepresentation,
                },
                [(node.get("position") as Value.Record).value.y.uuid]: {
                    type: "number",
                    rep: (node.get("position") as Value.Record).value.y.serialRepresentation,
                },
            },
        });

        expect(Model.fromSerial(raw, examplePlugin).graph.deepEqual(model.graph)).to.be.true;
    });

    it("serializes complex graph", () => {
        let model = new Model(examplePlugin);
        {
            const s1 = model.environment.make(new Type.Primitive("string"));
            const s2 = model.environment.make(new Type.Primitive("string"));
            s1.value = "hello";
            s2.value = "hi";

            const n1 = model.makeNode();
            n1.set("label", s2);
            const n2 = model.makeNode();
            const n3 = model.makeNode();
            const n4 = model.makeNode();

            model.makeEdge(undefined, n1, n2);
            model.makeEdge(undefined, n1, n3).set("label", s1);
            model.makeEdge(undefined, n3, n4);
            model.makeEdge(undefined, n3, n1);
            model.makeEdge(undefined, n4, n1);
        }
        model = Model.fromSerial(model.serialize(), examplePlugin);
        expect(model.nodes.size).to.equal(4);
        expect(model.edges.size).to.equal(5);
        const n1 = ifilter((n) => (n.get("label") as Value.Primitive).value === "hi"
            , model.nodes)[Symbol.iterator]().next().value;
        const outgoing = [...ifilter((e) => (e.get("source") as Value.Union).value === n1, model.edges)];
        expect(outgoing.length).to.equal(2);
        expect([...ifilter(e => (e.get("label") as Value.Primitive).value === "hello", outgoing)].length).to.equal(1);
    });



    describe("Graph.nodes/edges", () => {
        it("infers nodes", () => {
            const plugin = new ExamplePlugin(pluginInfo, []);
            const nodes = plugin.types.graph.members.get("nodes") as Value.ArrayType;
            expect(nodes).to.instanceof(Value.ArrayType);
            expect(nodes.typeParameter).to.instanceof(Type.Union);
        });

        it("infers edges", () => {
            const plugin = new ExamplePlugin(pluginInfo, []);
            const edges = plugin.types.graph.members.get("edges") as Value.ArrayType;
            expect(edges).to.instanceof(Value.ArrayType);
            expect(edges.typeParameter).to.instanceof(Type.Union);
        });

        it("allows exhaustive edges", () => {
            const cedg1 = new Type.CustomObject("Edge1", null, new Map());
            const cedg2 = new Type.CustomObject("Edge2", null, new Map());
            expect(() => new ExamplePlugin(pluginInfo, [['edges', new Value.ArrayType(new Type.Union([cedg1, cedg2]))]], undefined, [cedg1, cedg2])).to.not.throw();
        });

        it("complains about non-exhaustive edges", () => {
            const cedg1 = new Type.CustomObject("Edge1", null, new Map());
            const cedg2 = new Type.CustomObject("Edge2", null, new Map());
            expect(() => new ExamplePlugin(pluginInfo, [['edges', new Value.ArrayType(new Type.Union([cedg1]))]], undefined, [cedg1, cedg2])).to.throw();
        });

        it("allows exhaustive nodes", () => {
            const node1 = new Type.CustomObject("Node1", null, new Map());
            const node2 = new Type.CustomObject("Node2", null, new Map());
            expect(() => new ExamplePlugin(pluginInfo, [['nodes', new Value.ArrayType(new Type.Union([node1, node2]))]], [node1, node2])).to.not.throw();
        });

        it("complains about non-exhaustive nodes", () => {
            const node1 = new Type.CustomObject("Node1", null, new Map());
            const node2 = new Type.CustomObject("Node2", null, new Map());
            expect(() => new ExamplePlugin(pluginInfo, [['nodes', new Value.ArrayType(new Type.Union([node1]))]], [node1, node2])).to.throw();
        });
    });
});