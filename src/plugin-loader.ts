import * as ts from "typescript";
import * as fs from "fs";

import { Plugin } from "./plugin";

const options: ts.CompilerOptions = {
    noEmitOnError: false,
    noImplicitAny: true,
    target: ts.ScriptTarget.ES2016,
    removeComments: false,
    module: ts.ModuleKind.AMD,
    outFile: "result.js",
};

/**
 * An abstract representation of a plugin 
 */
export function loadPlugin(pluginLocation: string) {
    let script: string;
    const host = createCompilerHost(new Map([
        ["plugin.ts", fs.readFileSync(pluginLocation, "utf-8")],
        ["plugin-stub.ts", require("!!raw-loader!../sinap-includes/plugin-stub.ts")],
        ["sinap.d.ts", require("!!raw-loader!../sinap-includes/sinap.d.ts")],
        ["types-interfaces.d.ts", require("!!raw-loader!../sinap-includes/types-interfaces.d.ts")],
    ]), options, (name, content) => {
        // TODO: actually use AMD for cicular dependencies
        script = require("!!raw-loader!../sinap-includes/amd-loader.js") + "\n" + content;
    });

    const program = ts.createProgram(["plugin-stub.ts"], options, host);

    const results = program.emit();
    return new Plugin(program, { emitResults: results, js: script });
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
                source = fs.readFileSync("node_modules/typescript/lib/" + fileName, "utf-8");
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
