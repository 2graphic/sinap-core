import { Plugin, printDiagnostics } from "../src/plugin-loader";

export function run() {
    console.log("testing plugin loader")
    const plugin = new Plugin("tests/plugin1.ts");

    printDiagnostics(plugin.results);

    console.log(plugin.script);
}