import { forwardRef } from 'react';
import { TextInput as NativeTextInput, type TextInputInstance, type TextInputProps } from 'react-native';

import { useLanguage } from './language-provider';

/** Text input adapter that localizes fixed placeholders and accessibility copy. */
export const LocalizedTextInput = forwardRef<TextInputInstance, TextInputProps>(function LocalizedTextInput(props, ref) {
  const { translate } = useLanguage();
  return <NativeTextInput
    {...props}
    ref={ref}
    placeholder={props.placeholder ? translate(props.placeholder) : props.placeholder}
    accessibilityLabel={props.accessibilityLabel ? translate(props.accessibilityLabel) : props.accessibilityLabel}
    accessibilityHint={props.accessibilityHint ? translate(props.accessibilityHint) : props.accessibilityHint}
  />;
});
