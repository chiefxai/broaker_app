import { createContext, useContext, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

const CloseMenu = createContext<() => void>(() => {});

export function Host({ children }: { children: ReactNode }) { return <View>{children}</View>; }
export function RNHostView({ children }: { children: ReactNode }) { return <View>{children}</View>; }
export function Divider() { return <View />; }
export function Menu({ label, modifiers, children }: { label: ReactNode; modifiers?: { $type: string; label?: string }[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const name = modifiers?.find(modifier => modifier.$type === 'accessibilityLabel')?.label ?? 'More options';
  return <View><Pressable accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ expanded: open }} onPress={() => setOpen(true)}>{label}</Pressable>
    {open ? <CloseMenu.Provider value={() => setOpen(false)}><Pressable accessibilityRole="button" accessibilityLabel="Dismiss menu" onPress={() => setOpen(false)} /><View>{children}</View></CloseMenu.Provider> : null}
  </View>;
}
export function Button({ label, onPress }: { label: string; onPress: () => void }) {
  const close = useContext(CloseMenu);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { close(); onPress(); }}><Text>{label}</Text></Pressable>;
}
