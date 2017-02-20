export class Nodes { };
export class Edges { };
export class Graph { };

export function start(g: Graph, n1: any, n2: any): any;
export function start(g: Graph, n1: number, n2: number): number;
export function start(g: Graph, n1: number, n2: string): number;
export function start(g: Graph, s1: string, s2: string): string;
export function start(g: Graph, s1: string, s2: string): string | number;

export function start(g: Graph, a1: any, a2: any) {
    return a1;
}

// TODO: proper erros if this isn't here
export class State {

}