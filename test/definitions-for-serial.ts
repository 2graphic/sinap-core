class Node1 {
    a: boolean
}

class Node2 {
    b: {
        n: Node1
    }
}

class Edge1 {
    label: string
    destination: Node1 | Node2
}

class Graph1 {
    startState: Node1 | Node2
}

type Nodes = Node1 | Node2
type Edges = Edge1
type Graph = Graph1

export function start() {
    
}