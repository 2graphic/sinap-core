import { Value, Type } from "sinap-types";
import { validateEdge, Plugin, ElementValue, ElementType } from ".";
import { expect } from "chai";

describe("validateEdge", () => {
    function setup() {
        return {
            env: new Value.Environment(),
            edgeA: new ElementType(new Type.CustomObject("EdgeA", null, new Map()), new Type.CustomObject("d1", null, new Map())),
            edgeB: new ElementType(new Type.CustomObject("EdgeB", null, new Map()), new Type.CustomObject("d2", null, new Map())),
            nodeA: new ElementType(new Type.CustomObject("NodeA", null, new Map()), new Type.CustomObject("d3", null, new Map())),
            nodeB: new ElementType(new Type.CustomObject("NodeB", null, new Map()), new Type.CustomObject("d4", null, new Map())),
        };
    }

    const plugin: Plugin = {
        validateEdge() {
            return true;
        }
    } as Plugin;

    it("checks 'parents'", () => {
        const { env, edgeA, nodeA, edgeB, nodeB } = setup();

        nodeA.pluginType.members.set("parents", new Value.ArrayType(edgeA.pluginType));

        const src = new ElementValue(nodeB, env);
        const dest = new ElementValue(nodeA, env);
        const edge_A = new ElementValue(edgeA, env);
        const edge_B = new ElementValue(edgeB, env);
        expect(validateEdge(plugin, src, dest, edge_A)).to.be.true;
        expect(validateEdge(plugin, src, dest, edge_B)).to.be.false;
    });

    it("checks 'children'", () => {
        const { env, edgeA, nodeA, edgeB, nodeB } = setup();

        nodeA.pluginType.members.set("children", new Value.ArrayType(edgeA.pluginType));

        const src = new ElementValue(nodeA, env);
        const dest = new ElementValue(nodeB, env);
        const edge_A = new ElementValue(edgeA, env);
        const edge_B = new ElementValue(edgeB, env);
        expect(validateEdge(plugin, src, dest, edge_A)).to.be.true;
        expect(validateEdge(plugin, src, dest, edge_B)).to.be.false;
    });

    it("checks 'source'", () => {
        const { env, edgeA, nodeA, nodeB } = setup();

        edgeA.pluginType.members.set("source", nodeA.pluginType);

        const srcA = new ElementValue(nodeA, env);
        const srcB = new ElementValue(nodeB, env);
        const dest = new ElementValue(nodeB, env);
        const edge = new ElementValue(edgeA, env);
        expect(validateEdge(plugin, srcA, dest, edge)).to.be.true;
        expect(validateEdge(plugin, srcB, dest, edge)).to.be.false;
    });

    it("checks 'destination'", () => {
        const { env, edgeA, nodeA, nodeB } = setup();

        edgeA.pluginType.members.set("destination", nodeA.pluginType);

        const src = new ElementValue(nodeB, env);
        const destA = new ElementValue(nodeA, env);
        const destB = new ElementValue(nodeB, env);
        const edge = new ElementValue(edgeA, env);
        expect(validateEdge(plugin, src, destA, edge)).to.be.true;
        expect(validateEdge(plugin, src, destB, edge)).to.be.false;
    });

    it("checks 'validateEdge'", () => {
        const { env, edgeA, nodeA, nodeB } = setup();

        nodeA.pluginType.members.set("val", new Type.Primitive("boolean"));
        nodeA.members.set("val", new Type.Primitive("boolean"));

        const plugin: Plugin = {
            validateEdge(src) {
                return src && (src.get("val") as Value.Primitive).value;
            }
        } as Plugin;


        const src = new ElementValue(nodeA, env);
        const dest = new ElementValue(nodeB, env);
        const edge = new ElementValue(edgeA, env);
        src.set("val", new Value.Primitive(new Type.Primitive("boolean"), env, false));
        expect(validateEdge(plugin, src, dest, edge)).to.be.false;
        src.set("val", new Value.Primitive(new Type.Primitive("boolean"), env, true));
        expect(validateEdge(plugin, src, dest, edge)).to.be.true;
    });
});