import * as plugin from "./plugin";

function deserialize(pojo: { elements: any[] }) {
    const elements = pojo.elements;

    const traverse = (a: any) => {
        if (typeof (a) !== "object") {
            return;
        }
        for (const k of Object.getOwnPropertyNames(a)) {
            const el = a[k];
            if (el.kind === "sinap-pointer") {
                a[k] = this.elements[el.index];
            } else {
                traverse(el);
            }
        }
    }

    traverse(pojo.elements);

    for (let i = 0; i < pojo.elements.length; i++) {
        this.elements[i].data = pojo.elements[i].data;
    }
}