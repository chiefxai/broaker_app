import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/theme/tokens';
import { Toast, type ToastVariant } from './Toast';

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant, durationMs?: number) => void;
  dismissToast: () => void;
}

interface ToastEntry {
  message: string;
  variant: ToastVariant;
  durationMs: number;
  id: number;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastEntry | null>(null);
  const nextId = useRef(0);
  const insets = useSafeAreaInsets();
  const dismissToast = useCallback(() => setToast(null), []);
  const showToast = useCallback((message: string, variant: ToastVariant = 'info', durationMs = 4000) => {
    if (!message.trim()) return;
    nextId.current += 1;
    setToast({ id: nextId.current, message, variant, durationMs: Math.max(0, durationMs) });
  }, []);

  useEffect(() => {
    if (!toast || toast.durationMs === 0) return;
    const timer = setTimeout(() => setToast(null), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast]);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);
  return <ToastContext.Provider value={value}>
    {children}
    {toast ? <View pointerEvents="box-none" style={[styles.host, { paddingTop: Math.max(insets.top, Spacing.two) }]}>
      <Toast key={toast.id} message={toast.message} variant={toast.variant} onDismiss={dismissToast} />
    </View> : null}
  </ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFill, zIndex: 10000, elevation: 10000, alignItems: 'center', paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
});
