function getNS(a){
    if (global[a] === undefined){
        global[a] = {};
    }
    return global[a];
}

function define(name, requires, func){
    let exports = getNS(name);
    let args = requires.slice(2).map(getNS);
    func(...[null, exports].concat(args));
}