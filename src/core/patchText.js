import React from 'react';
import { StyleSheet } from 'react-native';

const RN = require('react-native');
const OriginalText = RN.Text;

// Function to determine Poppins font family based on style's fontWeight
const getPoppinsFont = (style) => {
  let fontFamily = 'Poppins-Regular';
  if (style) {
    const flattened = StyleSheet.flatten(style);
    if (flattened && flattened.fontWeight) {
      const w = flattened.fontWeight.toString();
      if (w === 'bold' || w === '700' || w === '800') {
        fontFamily = 'Poppins-Bold';
      } else if (w === '900') {
        fontFamily = 'Poppins-Black';
      } else if (w === '600') {
        fontFamily = 'Poppins-SemiBold';
      } else if (w === '500' || w === 'medium') {
        fontFamily = 'Poppins-Medium';
      }
    }
  }
  return fontFamily;
};

// 1. Patch the render function of the existing Text component (affects already imported instances)
if (OriginalText && OriginalText.render) {
  const originalRender = OriginalText.render;
  OriginalText.render = function (props, ref) {
    const fontFamily = getPoppinsFont(props?.style);
    const newProps = {
      ...props,
      style: [{ fontFamily }, props?.style],
    };
    return originalRender.call(this, newProps, ref);
  };
}

// 2. Override the export for any future imports
const CustomText = React.forwardRef((props, ref) => {
  const { style, children, ...rest } = props;
  const fontFamily = getPoppinsFont(style);
  return (
    <OriginalText ref={ref} {...rest} style={[{ fontFamily }, style]}>
      {children}
    </OriginalText>
  );
});

const OriginalTextInput = RN.TextInput;
const CustomTextInput = React.forwardRef((props, ref) => {
  const { style, ...rest } = props;
  const fontFamily = getPoppinsFont(style);
  return (
    <OriginalTextInput ref={ref} {...rest} style={[{ fontFamily }, style]} />
  );
});

// Re-assign in exports
Object.defineProperty(RN, 'Text', {
  get() {
    return CustomText;
  },
  configurable: true,
  enumerable: true,
});

Object.defineProperty(RN, 'TextInput', {
  get() {
    return CustomTextInput;
  },
  configurable: true,
  enumerable: true,
});

