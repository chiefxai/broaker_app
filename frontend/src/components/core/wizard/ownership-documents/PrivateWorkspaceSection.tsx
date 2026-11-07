import { Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { CoreTextField } from '../../forms/CoreTextField';
import { AppIcon } from '../../icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import type { AssignedFieldAssociate } from './types';

export function PrivateWorkspaceSection({ fieldAssociate, onChooseFieldAssociate, privateNotes, onPrivateNotesChange, lastEditedLabel = 'Not edited yet' }: {
  fieldAssociate?: AssignedFieldAssociate | null;
  onChooseFieldAssociate?: () => void;
  privateNotes: string;
  onPrivateNotesChange: (value: string) => void;
  lastEditedLabel?: string;
}) {
  const colors = useTheme();
  const initials = fieldAssociate?.initials ?? fieldAssociate?.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() ?? '';

  return <View style={styles.section}>
    <View style={styles.headingCopy}><Text style={[styles.heading, { color: colors.text }]}>Private Workspace & Internal Notes</Text><Text style={[styles.description, { color: colors.textSecondary }]}>Confidential collaboration for agency associates only</Text></View>
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.fieldGroup}>
        <View style={styles.fieldLabelRow}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Day-to-day Field Associate</Text><View style={styles.assignmentLabel}><AppIcon name="shield" size={13} color={colors.accent} /><Text style={[styles.assignedText, { color: colors.accent }]}>Assigned Lead</Text></View></View>
        <Pressable accessibilityRole="button" accessibilityLabel={fieldAssociate ? `Field associate: ${fieldAssociate.name}` : 'Assign field associate'} disabled={!onChooseFieldAssociate} onPress={onChooseFieldAssociate} style={[styles.contactRow, { backgroundColor: colors.surfaceLow }]}>
          <View style={[styles.initialsBadge, { backgroundColor: colors.accentContainer }]}>{initials ? <Text style={[styles.initialsText, { color: colors.onAccentContainer }]}>{initials}</Text> : <AppIcon name="person_add" size={15} color={colors.onAccentContainer} />}</View>
          <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>{fieldAssociate?.name ?? 'Assign a field associate'}</Text>
          <Text style={[styles.contactPhone, { color: colors.textSecondary }]} numberOfLines={1}>{fieldAssociate?.phone ?? ''}</Text>
        </Pressable>
      </View>
      <View style={styles.fieldGroup}>
        <View style={styles.fieldLabelRow}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Private Broker Ledger Notes</Text><Text style={[styles.lastEdited, { color: colors.textSecondary }]}>{lastEditedLabel}</Text></View>
        <CoreTextField accessibilityLabel="Private broker ledger notes" value={privateNotes} onChangeText={onPrivateNotesChange} placeholder="Add confidential property diligence notes..." multiline numberOfLines={3} maxLength={2000} testID="private-broker-notes" />
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two }, headingCopy: { gap: Spacing.half }, heading: { ...Typography.title }, description: { ...Typography.bodySmall },
  card: { padding: Spacing.three, borderRadius: Radius.medium, gap: Spacing.three }, fieldGroup: { gap: Spacing.one }, fieldLabelRow: { minHeight: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, fieldLabel: { ...Typography.labelSmall }, assignmentLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half }, assignedText: { ...Typography.labelSmall },
  contactRow: { minHeight: 48, paddingHorizontal: Spacing.two, borderRadius: Radius.small, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, initialsBadge: { width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' }, initialsText: { ...Typography.labelSmall }, contactName: { flex: 1, minWidth: 0, ...Typography.bodySmall }, contactPhone: { ...Typography.labelSmall }, lastEdited: { ...Typography.labelSmall },
});
