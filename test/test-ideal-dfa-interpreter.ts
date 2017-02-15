/// <reference path="../typings/globals/mocha/index.d.ts" />
import { interpret, DFAGraph } from "./dfa-definitions";
import * as assert from "assert";

describe("run the ideal interpreter v1", ()=>{
    describe("graph 1", ()=>{
        const g: DFAGraph = {
            startState: {
                children: [
                    {
                        label: "1",
                        destination: {
                            isAcceptState: true,
                            children: [],
                        }
                    }
                ],
                isAcceptState: false,
            }
        } 
        it("1", ()=>{
            assert.equal(true, interpret(g, "1"));
        });
        it("0", ()=>{
            assert.equal(false, interpret(g, "0"));
        });
        it("empty", ()=>{
            assert.equal(false, interpret(g, ""));
        });
        it("10", ()=>{
            assert.equal(false, interpret(g, "10"));
        });
        it("101", ()=>{
            assert.equal(false, interpret(g, "101"));
        });
    });
    describe("graph 2", ()=>{
        const g: DFAGraph = {
            startState: {
                children: [
                    {
                        label: "1",
                        destination: {
                            isAcceptState: true,
                            children: [],
                        }
                    }
                ],
                isAcceptState: false,
            }
        } 
        g.startState.children[0].destination.children.push({
            label: "0",
            destination: g.startState,
        });

        it("101", ()=>{
            assert.equal(true, interpret(g, "101"));
        });
        it("10", ()=>{
            assert.equal(false, interpret(g, "10"));
        });
    });
});