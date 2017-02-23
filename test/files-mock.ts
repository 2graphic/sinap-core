import * as fs from "fs";
import * as path from "path";
import { File, Directory, FileService, AppLocations } from "../src/files";

function surroundSync<T>(func: () => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        try {
            resolve(func());
        } catch (err) {
            reject(err);
        }
    });
}

class LocalFile implements File {
    readonly name: string;

    constructor(readonly fullName: string) {
        this.name = path.basename(fullName);
    }

    readData(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            // data is a string but something weird is going on.
            fs.readFile(this.fullName, 'utf8', (err: any, data: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    writeData(data: string): Promise<{}> {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.fullName, data, (err: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(err);
                }
            });
        });
    }
}

class LocalDirectory implements Directory {
    readonly name: string;

    constructor(readonly fullName: string) {
        this.name = path.basename(fullName);
    }

    private traverseDirectory(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            fs.readdir(this.fullName, (err: any, names: string[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(names.map((name) => path.join(this.fullName, name)));
                }
            });
        });
    }

    private isDirectory(fullName: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            fs.stat(fullName, (err: any, stats: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(stats.isDirectory());
                }
            });
        });
    }

    private traverseDirectoryWithType(): Promise<(LocalFile | LocalDirectory)[]> {
        return this.traverseDirectory()
            .then((names) => {
                return Promise.all(names.map((name) => {
                    return this.isDirectory(name)
                        .then((isDirectory) => {
                            if (isDirectory) {
                                return new LocalDirectory(name);
                            } else {
                                return new LocalFile(name);
                            }
                        });
                }));
            });
    }

    getSubDirectories(): Promise<Directory[]> {
        return this.traverseDirectoryWithType()
            .then((results) => {
                // this is typesafe even though TypeScript doesn't think it is.
                return results.filter((result) => result instanceof LocalDirectory) as any;
            });
    }

    getFiles(): Promise<File[]> {
        return this.traverseDirectoryWithType()
            .then((results) => {
                // this is typesafe even though TypeScript doesn't think it is.
                return results.filter((result) => result instanceof LocalFile) as any;
            });
    }
}

export class LocalFileService implements FileService {
    getAppLocations(): Promise<AppLocations> {
        const pluginPath = path.join('.', 'plugins');
        const result: AppLocations = {
            currentDirectory: new LocalDirectory('.'),
            pluginDirectory: new LocalDirectory(pluginPath)
        };

        return Promise.resolve(result);
    }

    fileByName(fullName: string): Promise<File> {
        return surroundSync(() => new LocalFile(fullName));
    }

    directoryByName(fullName: string): Promise<Directory> {
        return surroundSync(() => new LocalDirectory(fullName));
    }

    requestSaveFile(): Promise<File> {
        return null as any;
    }

    requestFiles(): Promise<File[]> {
        return null as any;
    }

    joinPath(...paths: string[]): string {
        return path.join(...paths);
    }

    getModuleFile(file: string): string {
        return fs.readFileSync(path.join('node_modules', file), 'utf8') as any;
    }
}