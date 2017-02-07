import { interpret, DFAGraph } from "./dfa-definitions";


export function run(){
    console.log("Testing the dfa interpreter:")
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

    console.log("1.", interpret(g, "1") === true);
    console.log("2.", interpret(g, "0") === false);
    console.log("3.", interpret(g, "") === false);
    console.log("4.", interpret(g, "10") === false);
    console.log("5.", interpret(g, "101") === false);

    g.startState.children[0].destination.children.push({
        label: "0",
        destination: g.startState,
    });

    console.log("6.", interpret(g, "101") === true);
    console.log("7.", interpret(g, "10") === false);
}