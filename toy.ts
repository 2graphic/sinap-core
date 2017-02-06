import * as ts from "../TypeScript/built/local/typescript";

function generateDocumentation(fileNames: string[], options: ts.CompilerOptions, searchNames: Set<string>): void {
    // Build a program using the set of root file names in fileNames
    const program = ts.createProgram(fileNames, options);

    // Get the checker, we will use it to find more about classes
    const checker = program.getTypeChecker();

    const results = new Map([...searchNames].map((x)=>[x, new Set()] as [string, Set<ts.Type>]));

    // TODO: only vist the right source file or at least filter by module
    // Visit every sourceFile in the program    
    for (const sourceFile of program.getSourceFiles()) {
        // Walk the tree to search for classes
        ts.forEachChild(sourceFile, visit);
    }

    for (const [name, types] of results.entries()){
        for (const type of types){
            console.log(name, checker.getApparentType(type));
        }
    }

    return;

    function assign(symbol: ts.Symbol, originalSymbol: ts.Symbol | null){
        const t = checker.getTypeOfSymbol(symbol);
        if (originalSymbol){
            const ot = checker.getTypeOfSymbol(originalSymbol);
            if (checker.isAssignableTo(t, ot)){
                results.get(originalSymbol.name).add(t);
            }
        } else if (searchNames.has(symbol.name)){
            results.get(symbol.name).add(t);
        }
    }

    /** visit nodes finding exported classes */    
    function visit(node: ts.Node, originalSymbol: ts.Symbol | null = null) {
        switch (node.kind){
            case ts.SyntaxKind.TypeReference: {
                const referenceDeclaration = node as ts.TypeReferenceNode;
                assign(checker.getSymbolAtLocation(referenceDeclaration.typeName), originalSymbol);
                break;
            }
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.InterfaceDeclaration: {
                const literalDeclaration = node as ts.InterfaceDeclaration | ts.ClassDeclaration;
                assign(checker.getSymbolAtLocation(literalDeclaration.name), originalSymbol);
                break;
            }
            case ts.SyntaxKind.TypeAliasDeclaration: {
                const aliasDeclaration = node as ts.TypeAliasDeclaration;
                const symbol = checker.getSymbolAtLocation(aliasDeclaration.name);
                originalSymbol = originalSymbol !== null ? originalSymbol : symbol;
                break;
            }
            case ts.SyntaxKind.ModuleDeclaration: {
                ts.forEachChild(node, (a)=>visit(a, originalSymbol));
                return;
            }
        }
        // deep traveral if we're in a type alias
        if (originalSymbol && searchNames.has(originalSymbol.name)) {
                ts.forEachChild(node, (a)=>visit(a, originalSymbol));
        }
    }
}

generateDocumentation(["./definitions.ts"], {
    target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, noLib: true
}, new Set([
    "Nodes",
    "Edges",
    "Graph"
]));