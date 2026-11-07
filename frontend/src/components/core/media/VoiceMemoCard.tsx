import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '../icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export type VoiceMemoState = 'idle' | 'recording' | 'uploading' | 'ready' | 'playing' | 'error';

export interface VoiceMemoCardProps {
  state: VoiceMemoState;
  title?: string;
  durationSeconds?: number;
  elapsedSeconds?: number;
  errorMessage?: string;
  onRecord?: () => void;
  onStop?: () => void;
  onPlayPause?: () => void;
  onDelete?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function formatDuration(seconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safeSeconds / 60).toString().padStart(2, '0')}:${(safeSeconds % 60).toString().padStart(2, '0')}`;
}

export function VoiceMemoCard({
  state,
  title = state === 'idle' ? 'Record field audio memo' : 'Field voice note',
  durationSeconds,
  elapsedSeconds = 0,
  errorMessage = 'Audio note could not be loaded.',
  onRecord,
  onStop,
  onPlayPause,
  onDelete,
  style,
  testID,
}: VoiceMemoCardProps) {
  const colors = useTheme();
  const recording = state === 'recording';
  const playable = state === 'ready' || state === 'playing';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]} testID={testID}>
      <View style={[styles.iconBox, { backgroundColor: recording ? colors.dangerContainer : colors.surfaceContainer }]}>
        <AppIcon name="mic" size={18} color={recording ? colors.danger : colors.accent} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {state === 'error' ? (
          <Text accessibilityRole="alert" style={[styles.subtext, { color: colors.dangerText }]}>{errorMessage}</Text>
        ) : (
          <View style={styles.metaRow}>
            <Text style={[styles.subtext, { color: recording ? colors.danger : colors.textSecondary }]}>
              {recording ? `Recording · ${formatDuration(elapsedSeconds)}` : state === 'uploading' ? 'Uploading securely…' : playable ? formatDuration(durationSeconds) : 'No recording yet'}
            </Text>
            {playable && <View accessibilityLabel="Audio waveform" style={styles.waveform}>{[8, 14, 10, 18, 12, 20, 9, 15, 7, 17, 11, 6].map((height, index) => <View key={index} style={[styles.waveBar, { height, backgroundColor: colors.accent }]} />)}</View>}
          </View>
        )}
      </View>
      {recording ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Stop recording" onPress={onStop} style={[styles.control, { backgroundColor: colors.dangerContainer }]}>
          <AppIcon name="pause" size={18} color={colors.danger} />
        </Pressable>
      ) : playable ? (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel={state === 'playing' ? 'Pause voice note' : 'Play voice note'} onPress={onPlayPause} style={[styles.control, { backgroundColor: colors.accent }]}>
            <AppIcon name={state === 'playing' ? 'pause' : 'play'} size={17} color={colors.onPrimary} />
          </Pressable>
          {onDelete && <Pressable accessibilityRole="button" accessibilityLabel="Delete voice note" onPress={onDelete} style={styles.deleteControl}><AppIcon name="delete" size={17} color={colors.danger} /></Pressable>}
        </>
      ) : state === 'idle' ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Start recording" onPress={onRecord} style={[styles.control, { backgroundColor: colors.accent }]}>
          <AppIcon name="mic" size={17} color={colors.onPrimary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radius.medium, padding: Spacing.two },
  iconBox: { width: 38, height: 38, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minWidth: 0, gap: Spacing.one },
  title: { ...Typography.label },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  subtext: { ...Typography.bodySmall },
  waveform: { height: 20, flexDirection: 'row', alignItems: 'center', gap: 2 },
  waveBar: { width: 2, borderRadius: Radius.pill },
  control: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  deleteControl: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
});
