import { loadPlugin } from "../src/plugin-loader";

export function run() {
    console.log("testing plugin loader")
    const plugin = loadPlugin("tests/plugin1.ts");

    plugin.printResults();
}