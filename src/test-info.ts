import { expect } from "chai";
import { getPluginInfo, PluginInfo } from "./index";
import * as path from "path";

describe("InterpreterInfo", () => {
    let dfa: PluginInfo;
    before(async () => {
        dfa = (await getPluginInfo(path.join("test-support", "dfa")));
    });

    it("has a description", () => expect(dfa.description).to.equal("A DFA interpreter for Sinap."));
    it("has a kind", () => expect(dfa.pluginKind).to.deep.equals(["Formal Languages", "DFA"]));
    it("has a loader", () => expect(dfa.interpreterInfo.loader).to.equal("example"));
    it("has an interpreter", () => expect(dfa.interpreterInfo.interpreter).to.equal(path.join(dfa.interpreterInfo.directory, "dfa-interpreter.ts")));
    it("has a directory", () => expect(dfa.interpreterInfo.directory).to.equal(path.join("test-support", "dfa")));
    it("has custom info", () => expect(dfa.packageJson.name).to.equal("dfa"));
});