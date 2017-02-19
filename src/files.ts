// File: files.service.ts
// Created by: Dyllon Gagnier
// Date created: January 16, 2017
//
// Contributors: CJ Dimaano
//
// Resources:
// https://nodejs.org/api/fs.html

// TODO: Add in a service that does not use electron for static website.
export interface NamedEntity {
    name: string;
    fullName: string;
}

export interface File extends NamedEntity {
    readData(): Promise<string>;
    writeData(data: string): Promise<{}>;
}

export interface Directory extends NamedEntity {
    getSubDirectories(): Promise<Directory[]>;
    getFiles(): Promise<File[]>;
}

export interface FileService {
    getAppLocations(): Promise<AppLocations>;
    fileByName(fullName: string): Promise<File>;
    directoryByName(fullName: string): Promise<Directory>;
    requestSaveFile(): Promise<File>;
    requestFiles(): Promise<File[]>;
}

export interface AppLocations {
    currentDirectory: Directory,
    pluginDirectory: Directory
}
