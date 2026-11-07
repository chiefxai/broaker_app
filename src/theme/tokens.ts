import { Platform } from 'react-native';

/** Semantic palette adapted from the supplied Broaker reference. */
export const Colors = {
  light: {
    text: '#0B1C30',
    background: '#F7FAF7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E8F5EA',
    textSecondary: '#45464D',
    surface: '#FFFFFF',
    surfaceLow: '#F0F7F1',
    surfaceContainer: '#E8F5EA',
    surfaceHigh: '#D8EEDB',
    primary: '#16803C',
    primaryPressed: '#11632E',
    onPrimary: '#FFFFFF',
    accent: '#16803C',
    accentContainer: '#D8EEDB',
    onAccentContainer: '#14532D',
    outline: '#76777D',
    border: '#C6C6CD',
    divider: '#E5E7EB',
    iconMuted: '#64748B',
    toggleTrack: '#E2E8F0',
    toggleBorder: '#CBD5E1',
    toggleThumb: '#FFFFFF',
    imageScrim: '#00000088',
    onScrim: '#FFFFFF',
    success: '#15803D',
    successContainer: '#DCFCE7',
    successText: '#166534',
    warning: '#B45309',
    warningContainer: '#FEF3C7',
    warningText: '#92400E',
    danger: '#BA1A1A',
    dangerContainer: '#FFDAD6',
    dangerText: '#93000A',
    info: '#15803D',
    infoContainer: '#DCFCE7',
    infoText: '#166534',
    neutralContainer: '#E8F5EA',
  },
  dark: {
    text: '#F8FAFC',
    background: '#090E1A',
    backgroundElement: '#111827',
    backgroundSelected: '#172A20',
    textSecondary: '#94A3B8',
    surface: '#111827',
    surfaceLow: '#131D2E',
    surfaceContainer: '#172A20',
    surfaceHigh: '#20382A',
    primary: '#4ADE80',
    primaryPressed: '#86EFAC',
    onPrimary: '#0B1C30',
    accent: '#4ADE80',
    accentContainer: '#183322',
    onAccentContainer: '#BBF7D0',
    outline: '#94A3B8',
    border: '#1F2D42',
    divider: '#1F2D42',
    iconMuted: '#94A3B8',
    toggleTrack: '#152033',
    toggleBorder: '#223554',
    toggleThumb: '#1E293B',
    imageScrim: '#00000099',
    onScrim: '#FFFFFF',
    success: '#4ADE80',
    successContainer: '#123321',
    successText: '#BBF7D0',
    warning: '#FBBF24',
    warningContainer: '#3B2A0E',
    warningText: '#FDE68A',
    danger: '#F87171',
    dangerContainer: '#3C1D25',
    dangerText: '#FECACA',
    info: '#4ADE80',
    infoContainer: '#183322',
    infoText: '#BBF7D0',
    neutralContainer: '#172A20',
  },
} as const;

export type ThemeScheme = keyof typeof Colors;
export type ThemePalette = (typeof Colors)[ThemeScheme];
export type ThemeColor = keyof ThemePalette;
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 16,
  card: 16,
  pill: 999,
} as const;

export const Typography = {
  body: { fontSize: 14, lineHeight: 22, fontWeight: '400' as const },
  bodySmall: { fontSize: 12, lineHeight: 18, fontWeight: '400' as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  labelSmall: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  heading: { fontSize: 24, lineHeight: 32, fontWeight: '600' as const },
  value: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 88 }) ?? 0;
export const AppFooterHeight = 64;
export const WideLayoutBreakpoint = 1100;
export const DesktopSidebarWidth = 248;
export const MaxContentWidth = 1120;
export const WideContentMaxWidth = 1360;

export function getStatusColors(palette: ThemePalette, tone: StatusTone) {
  switch (tone) {
    case 'success':
      return { background: palette.successContainer, foreground: palette.successText, icon: palette.success };
    case 'warning':
      return { background: palette.warningContainer, foreground: palette.warningText, icon: palette.warning };
    case 'danger':
      return { background: palette.dangerContainer, foreground: palette.dangerText, icon: palette.danger };
    case 'info':
      return { background: palette.infoContainer, foreground: palette.infoText, icon: palette.info };
    case 'neutral':
    default:
      return { background: palette.neutralContainer, foreground: palette.textSecondary, icon: palette.iconMuted };
  }
}
