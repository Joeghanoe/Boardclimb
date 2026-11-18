declare const problemKeyBrand: unique symbol;

/** Stable identity of a problem: manufacturer, configuration id and provider problem id (ADR-0003). */
export type ProblemKey = string & { readonly [problemKeyBrand]: true };
