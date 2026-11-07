import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, Text as NativeText, View } from 'react-native';

const MenuContext = createContext({ expanded: false, dismiss: () => {} });
export function Host({ children }: { children: ReactNode }) { return <View>{children}</View>; }
export function RNHostView({ children }: { children: ReactNode }) { return <View>{children}</View>; }
export function HorizontalDivider() { return <View />; }
export function Text({ children }: { children: ReactNode }) { return <NativeText>{children}</NativeText>; }
function Trigger({ children }: { children: ReactNode }) { return <View>{children}</View>; }
function Items({ children }: { children: ReactNode }) {
  const { expanded, dismiss } = useContext(MenuContext);
  return expanded ? <View><Pressable accessibilityRole="button" accessibilityLabel="Dismiss menu" onPress={dismiss} />{children}</View> : null;
}
export function DropdownMenu({ expanded = false, onDismissRequest, children }: { expanded?: boolean; onDismissRequest: () => void; children: ReactNode }) {
  return <MenuContext.Provider value={{ expanded, dismiss: onDismissRequest }}><View>{children}</View></MenuContext.Provider>;
}
DropdownMenu.Trigger = Trigger;
DropdownMenu.Items = Items;
function ItemText({ children }: { children: ReactNode }) { return <>{children}</>; }
function LeadingIcon({ children }: { children: ReactNode }) { return <>{children}</>; }
export function DropdownMenuItem({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <Pressable accessibilityRole="button" onPress={onClick}>{children}</Pressable>;
}
DropdownMenuItem.Text = ItemText;
DropdownMenuItem.LeadingIcon = LeadingIcon;
