// Stub for CSS imports under Jest.
//
// src/app/_layout.tsx imports ../../global.css — that import is meaningful to
// Metro (NativeWind v5 compiles it via its PostCSS pipeline) but is not valid
// JavaScript, so Jest chokes on it without this mapping. Tests assert on
// component structure and routing, not on compiled styles, so an empty object
// is the correct stand-in.
module.exports = {};
