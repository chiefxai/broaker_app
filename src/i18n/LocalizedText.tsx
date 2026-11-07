import { Text as NativeText, type TextProps } from 'react-native';
import type { ReactNode } from 'react';

import { useCurrentLanguage, type AppLanguage } from './language-provider';
import { mapLanguageText } from './language-mapper';

function localizeChildren(children: ReactNode, language: AppLanguage): ReactNode {
  if (typeof children === 'string') return mapLanguageText(children, language);
  if (typeof children === 'number' || children == null || typeof children === 'boolean') return children;
  if (Array.isArray(children)) return children.map((child) => localizeChildren(child, language));
  return children;
}

/** React Native Text that maps fixed English UI phrases through the active language catalog. */
export function LocalizedText({ children, ...props }: TextProps) {
  const language = useCurrentLanguage();
  return <NativeText
    {...props}
    accessibilityLabel={props.accessibilityLabel ? mapLanguageText(props.accessibilityLabel, language) : props.accessibilityLabel}
    accessibilityHint={props.accessibilityHint ? mapLanguageText(props.accessibilityHint, language) : props.accessibilityHint}>
    {localizeChildren(children, language)}
  </NativeText>;
}
