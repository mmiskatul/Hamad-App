// SVG files are compiled to React components by react-native-svg-transformer in
// Metro. Jest has no such transformer, so jest-expo's asset transformer hands
// back a plain object — rendering it throws "Element type is invalid". Map .svg
// to this stub component so screens that use SVG assets are renderable in tests.
const React = require('react');

function SvgMock(props) {
  return React.createElement('SvgMock', props, props.children);
}

module.exports = SvgMock;
module.exports.default = SvgMock;
module.exports.ReactComponent = SvgMock;
