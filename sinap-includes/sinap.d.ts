
export type ProgramOutput = any;
export type ProgramInput = any;

/**
 * This interface is to be used for debugging support and is expected to maintain mutable state.
 */
export interface RunningProgram {
    /**
     * These are the properties that will be displayed to the user. TODO: Allow for this to be more flexible if there are large numbers of properties available.
     */
    debugProperties: [string];

    /**
     * Gets the result of the computation after the program completes. Behavior is undefined if called when isComplete is false.
     */
    result: ProgramOutput | null;

    /**
     * Performs one unit of work in the forward direction. Advanced debugging support should be provided elsewhere (such as step over or continue).
     */
    step(): void;

    /**
     * Performs one unit of work backwards. This method is optional since backwards debugging may be non-trivial for some plugins.
     */
    stepBack?(): void;

    /**
     * Retrieves the value of a property enumerated in debugProperties.
     */
    getDebugValue(property: string): ProgramOutput;
}

/**
 * This represents a compiled program given an input computation graph. It should be immutable, though the RunningProgram returned by initDebugging may be mutable itself.
 * If desired, a simple run method or initDebugging method can be provided and then fillInProgram will fill out the rest of the required fields/methods.
 */
export interface Program {
    /**
     * Any messages associated with graph compilation.
     */
    compilationMessages: string[];

    /**
     * Runs the input according to the graph this program was derived from.
     */
    run(input: ProgramInput): ProgramOutput; // This should be filled in by fillInProgram if not present.

    /**
     * Creates a new debugging instance. While the returned instance may itself be mutable, this object should have no change in state. This method is optional.
     */
    initDebugging?(input: ProgramInput): RunningProgram; // This is completely optional and must be checked.
}