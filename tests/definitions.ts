class Character {}

class Node1 {
	a: boolean
}

class Node2 {
	parents: Edge1[]
	b: boolean
}

class Node3 {
	c: boolean
}

class Edge1 {
	/** Symbol */
	label: Character
	destination: Node1 | Node2
}

class Edge2 {
	source: Node1 | Node2
}

class Graph {
    startState: Node1
}

type Nodes = Node1 | Node2 | Node3
type Edges = Edge1 | Edge2