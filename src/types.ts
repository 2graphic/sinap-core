import * as ts from "typescript";
import * as interfaces from "../sinap-includes/types-interfaces";

/**
 * Store a mapping of typescript types to our wrappers.
 * 
 * In order to avoid infinite loops, we need to cache the ones
 * that we find. 
 */
export class TypeEnvironment {
    private types = new Map<ts.Type, Type>();

    constructor(public checker: ts.TypeChecker) {
    }

    getType(type: ts.Type) {
        const t = this.types.get(type);
        if (t) {
            return t;
        }
        let wrapped: Type;
        if (type.flags & ts.TypeFlags.Union) {
            wrapped = new UnionType(this, type as ts.UnionType);
        } else if (type.flags & ts.TypeFlags.Intersection) {
            wrapped = new IntersectionType(this, type as ts.IntersectionType);
        } else if (type.flags & ts.TypeFlags.Object) {
            wrapped = new ObjectType(this, type as ts.ObjectType);
        } else {
            wrapped = new Type(this, type);
        }
        this.types.set(type, wrapped);
        return wrapped;
    }
}

export class Type implements interfaces.Type {
    readonly name: string;
    // TODO: protect the arguments
    /**
     * Never call this manually, use getType on the appropriate 
     * TypeEnvironment
     */
    constructor(public env: TypeEnvironment, public type: ts.Type) {
        this.name = env.checker.typeToString(type);
    }

    /**
     * Return if this type is assignable to that type
     */
    public isAssignableTo(that: Type) {
        return this.env.checker.isAssignableTo(this.type, that.type);
    }
}

export class UnionType extends Type implements interfaces.UnionType {
    types: Type[];

    constructor(env: TypeEnvironment, type: ts.UnionType) {
        super(env, type);
        this.types = type.types.map(t => this.env.getType(t));
    }
}

export class IntersectionType extends Type implements interfaces.IntersectionType {
    types: Type[];

    constructor(env: TypeEnvironment, type: ts.IntersectionType) {
        super(env, type);
        this.types = type.types.map(t => this.env.getType(t));
    }
}

export class ObjectType extends Type implements interfaces.ObjectType {
    readonly members = new Map<string, Type>();

    constructor(env: TypeEnvironment, type: ts.ObjectType) {
        super(env, type);
        if (this.type.symbol === undefined || this.type.symbol.members === undefined) {
            //throw "not an object type";
            // TODO: address this
            return;
        }
        this.type.symbol.members.forEach((value, key) => {
            this.members.set(key, this.env.getType(this.env.checker.getTypeOfSymbol(value)));
        });
    }
}

/**
 * For each name in `searchNames` look for the 
 * the type that that symbol is declared as in SourceFile
 * and return the wrapped declared type. 
 */
export function getTypes(env: TypeEnvironment, file: ts.SourceFile, searchNames: Set<string>): Map<string, Type> {
    const results = new Map([...searchNames].map((x) => [x, new Set()] as [string, Set<Type>]));
    // TODO: I'm going to need this
    // ts.forEachChild(file, (parent)=>{
    //if (parent.kind === ts.SyntaxKind.ModuleDeclaration){
    ts.forEachChild(file, (node) => {
        // if it's not a class, and interface, or an
        // alias, we don't care about it
        if (!(node.kind === ts.SyntaxKind.ClassDeclaration
            || node.kind === ts.SyntaxKind.InterfaceDeclaration
            || node.kind === ts.SyntaxKind.TypeAliasDeclaration)) {
            return;
        }

        // declaration is the literal characters matched by the 
        // parser in the source file
        const declaration = node as ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration;

        // symbol is 1 layer of abstraction on the declaration
        // I'm not sure exactly what purpose it serves
        if (declaration.name === undefined) {
            return;
        }
        const symbol = env.checker.getSymbolAtLocation(declaration.name);

        // if `symbol.name` is something we're looking for
        // then r is a set
        const r = results.get(symbol.name);

        if (!r) {
            return;
        }
        // add node to to matches for `symbol.name`
        if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
            // need to follow aliases
            visitAlias(node, r);
        } else {
            r.add(env.getType(env.checker.getTypeOfSymbol(symbol)));
        }
        // });
        // }
    });

    // check the sets all contain 1 element and convert to a mapping
    // that points straight to that element
    return new Map([...results.entries()]
        .map(([k, v]) => {
            if (v.size !== 1) {
                throw "Redunadant type specification";
            }
            return [k, v.values().next().value] as [string, Type];
        }));

    // helper for aliases.
    function visitAlias(parent: ts.Node, r: Set<Type>): void {
        ts.forEachChild(parent, (node) => {
            // aliases have two children,
            // the first is the name that is being undefined
            // it is of type: ts.SyntaxKind.Identifier
            // and the second is what we're looking for
            // it's probably a union in our use case. 
            if (node.kind !== ts.SyntaxKind.Identifier && node.kind !== ts.SyntaxKind.ExportKeyword) {
                r.add(env.getType(env.checker.getTypeAtLocation(node)));
            }
        });
    }
}

export function validateEdge(edge: ObjectType, source?: ObjectType, destination?: ObjectType): boolean {
    const destinationExpected = edge !== undefined ? edge.members.get("destination") : null;
    const sourceExpected = edge !== undefined ? edge.members.get("source") : null;

    // constrain that 0th is assignable to 1st
    const constraints: [Type, Type][] = [];

    if (destinationExpected && destination) {
        constraints.push([destination, destinationExpected]);
    }

    if (sourceExpected && source) {
        constraints.push([source, sourceExpected]);
    }

    // constrain that the edge is assignable to the child array
    // and the parent array of the source and destination nodes
    // respectively
    if (destination !== undefined) {
        addParentChildConstraint(destination.members.get("parents"));
    }
    if (source !== undefined) {
        addParentChildConstraint(source.members.get("children"));
    }

    function addParentChildConstraint(listType?: Type) {
        // if there is actually the field declared
        if (listType) {
            if (listType.type.flags & ts.TypeFlags.Object) {
                const obj = listType.type as ts.ObjectType;
                if (obj.objectFlags & ts.ObjectFlags.Reference) {
                    const ref = obj as ts.TypeReference;
                    constraints.push([edge, listType.env.getType(ref.typeArguments[0])]);
                } else {
                    // don't care if there is a parents/child field
                    // but if there is, it better be a list
                    throw "parents/children must be a reference to an array type"
                }
            } else {
                // don't care if there is a parents/child field
                // but if there is, it better be a list
                throw "parents/children must be a reference to an array type"
            }
        }
    }

    return constraints.reduce((prev, [t1, t2]) => prev ? t1.isAssignableTo(t2) : false, true);
}