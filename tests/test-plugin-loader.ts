import { loadPlugin } from "../src/index";

export function run() {
    console.log("testing plugin loader")
    const plugin = loadPlugin("tests/dfa-definitions.ts");

    plugin.printResults();

    plugin.runCode();
}