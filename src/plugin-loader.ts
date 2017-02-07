import * as ts from "typescript";

/**
 * An abstract representation of a plugin 
 */
export class Plugin {
    /** The typescript entity corresponding to this plugin */
    private program: ts.Program;
    /** A virtual filesystem */
    private host: ts.CompilerHost;
    /** The compiled version of the plugin */
    script: string;
    /** The compilation results */
    results: ts.EmitResult;

    constructor(pluginLocation: string) {

        const options: ts.CompilerOptions = {
            noEmitOnError: true,
            noImplicitAny: true,
            target: ts.ScriptTarget.ES2016,
            removeComments: false,
            module: ts.ModuleKind.AMD,
            outFile: "result.js",
        };

        this.host = createCompilerHost(new Map([
            ["plugin.ts", ts.sys.readFile(pluginLocation)],
            ["plugin-stub.ts", require("!!raw-loader!../sinap-includes/plugin-stub.ts")],
            ["sinap.d.ts", require("!!raw-loader!../sinap-includes/sinap.d.ts")],
            ["types-interfaces.d.ts", require("!!raw-loader!../sinap-includes/types-interfaces.d.ts")],
        ]), options, (name, content) => {
            // TODO: actually use AMD for cicular dependencies
            this.script = require("!!raw-loader!../sinap-includes/amd-loader.js") + "\n" + content;
        });

        this.program = ts.createProgram(["plugin-stub.ts"], options, this.host);

        this.results = this.program.emit();
    }
}

export function printDiagnostics(results: ts.EmitResult) {
    for (const result of results.diagnostics) {
        console.log()
        if (result.file) {
            const { line, character } = result.file.getLineAndCharacterOfPosition(result.start);
            const starts = result.file.getLineStarts();
            console.log(result.file.fileName, line.toString() + ", " + character.toString() + ":", result.messageText);
            console.log(result.file.text.substring(starts[line], starts[line + 1] - 1).replace("\t", " "));
            let pad = "";
            for (let i = 0; i < character; i++) {
                pad += " ";
            }
            for (let i = 0; i < result.length; i++) {
                pad += "~";
            }
            console.log(pad);
        } else {
            console.log("unknown file:", result.messageText);
        }
    }
    console.log("Emit Skipped?", results.emitSkipped)
}

function createCompilerHost(files: Map<string, string>, options: ts.CompilerOptions, emit: (name: string, content: string) => void): ts.CompilerHost {
    return {
        getSourceFile: (fileName) => {
            let source = files.get(fileName);
            if (!source) {
                // if we didn't bundle the source file, maybe it's a lib? 
                if (fileName.indexOf("/") !== -1) {
                    throw "no relative/absolute paths here";
                }
                source = ts.sys.readFile("node_modules/typescript/lib/" + fileName);
            }
            return source ?
                ts.createSourceFile(fileName, source, options.target ? options.target : ts.ScriptTarget.ES2016)
                : undefined;
        },
        writeFile: (name, text) => {
            emit(name, text);
        },
        getDefaultLibFileName: () => {
            return "lib.es2016.d.ts";
        },
        useCaseSensitiveFileNames: () => false,
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => "",
        getNewLine: () => "\n",
        fileExists: (fileName): boolean => {
            return files.has(fileName)
        },
        readFile: () => "",
        directoryExists: () => true,
        getDirectories: () => []
    };
}
