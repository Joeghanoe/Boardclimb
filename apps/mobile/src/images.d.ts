/** Metro bundles images and hands the app an asset id for them. */
declare module '*.png' {
  const source: number;
  export default source;
}
