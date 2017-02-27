class A {
    number: number;
    possiblyUndefinedNumber: number | undefined;
    possiblyNullNumber: number | null;
}

class B {
    list: number[];
}

class C {
    list: (number | string)[];
}

class D {
    numberOrString: number | string;
}

class E {
    ab: { a: number, b: string };
}