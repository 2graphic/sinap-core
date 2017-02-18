[![Build Status](https://travis-ci.org/2graphic/sinap-core.svg?branch=master)](https://travis-ci.org/2graphic/sinap-core)
# The Type System

Sinap is an IDE and a framework for interpreters. A plugin fills in the blanks to make a complete IDE interpreter. At the bare minimum, a plugin my provide:

1. Type information. This tells sinap what constitutes a valid graph so that sinap can allow users to generate valid graphs and feed them to the interpreter. 
2. The interpreter. This allows sinap to actually run the graph

The type system is what allows the first part. In general types are something that exist only at compile time. It can be more complicated than that (see Python) but this mostly true in TypeScript. We need plugins to be able to discuss types at their compile time, which is runtime for sinap. Because of this, we need to at least partially implement a type checker. Before going into how everything works, heres a rundown of the goal:
