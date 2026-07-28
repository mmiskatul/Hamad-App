// Ambient declarations for image assets imported via Metro's assetExts (PNG, JPG, etc.).
// Required because TypeScript strict won't resolve `import x from '../../foo.png'` without help.
declare module '*.png' {
  const source: number;
  export default source;
}
declare module '*.jpg' {
  const source: number;
  export default source;
}
declare module '*.jpeg' {
  const source: number;
  export default source;
}
declare module '*.webp' {
  const source: number;
  export default source;
}
