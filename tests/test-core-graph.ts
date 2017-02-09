import { loadPlugin, CoreElementKind } from "../src/index";

export function run(){
    const plugin = loadPlugin("tests/plugin1.ts");
    const graph = plugin.makeElement(CoreElementKind.Graph);
    const n1 = plugin.makeElement(CoreElementKind.Node, "DFANode");
    const n2 = plugin.makeElement(CoreElementKind.Node, "DFANode");
    const e1 = plugin.makeElement(CoreElementKind.Edge, "DFAEdge");
    e1.data["source"] = n1;
    e1.data["destination"] = n2;

    graph.data['backgroundColor'] = "red";
}