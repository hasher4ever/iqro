import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { showAlert, formatMoney } from '../lib/utils';
import { Card, Button, Input, ScreenLoader, EmptyState } from '../components/UI';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenHeader } from '../components/ScreenHeader';

export default function PaymentScreen({ route, navigation }: any) {
const { classId, className } = route.params;
const students = useQuery(api.classes.getClassStudents, { classId });
const recordPayment = useMutation(api.transactions.recordPayment);

const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
const [amount, setAmount] = useState('');
const [note, setNote] = useState('');
const [saving, setSaving] = useState(false);

if (students === undefined) return <ScreenLoader />;

const handleRecord = async () => {
if (!selectedStudent || !amount) {
showAlert(t('error'), t('select_student_and_amount'));
return;
}
const numAmount = parseFloat(amount);
if (isNaN(numAmount) || numAmount <= 0) {
showAlert(t('error'), t('enter_valid_amount'));
return;
}

setSaving(true);
try {
await recordPayment({
classId,
studentId: selectedStudent as any,
amount: numAmount,
note: note || undefined,
});
showAlert(t('success'), t('payment') + ' recorded');
setAmount('');
setNote('');
setSelectedStudent(null);
} catch (error: any) {
showAlert(t('error'), error?.message || t('error_generic'));
} finally {
setSaving(false);
}
};

return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScreenHeader title={t('record_payment')} onBack={() => navigation.goBack()} />

<Text style={styles.className}>{className}</Text>

<ScrollView contentContainerStyle={styles.content}>
<Card>
<Text style={styles.sectionLabel}>{t('students')}</Text>
{students?.length === 0 ? (
<EmptyState message={t('no_results')} />
) : (
students?.map((s: any) => (
<StudentPaymentRow
key={s._id}
student={s}
classId={classId}
selected={selectedStudent === s._id}
onSelect={() => setSelectedStudent(s._id)}
/>
))
)}
</Card>

{selectedStudent && (
<Card>
<Input
label={t('amount') + ' (UZS)'}
value={amount}
onChangeText={setAmount}
placeholder="0"
keyboardType="numeric"
/>
<Input
label={t('note')}
value={note}
onChangeText={setNote}
placeholder={t('note')}
/>
<Button
title={t('record_payment')}
onPress={handleRecord}
loading={saving}
/>
</Card>
)}
</ScrollView>
</SafeAreaView>
);
}

function StudentPaymentRow({ student, classId, selected, onSelect }: any) {
const balance = useQuery(api.transactions.getStudentClassBalance, {
classId,
studentId: student._id,
});

return (
<TouchableOpacity
style={[styles.studentRow, selected && styles.studentRowActive]}
onPress={onSelect}
activeOpacity={0.7}
>
<View style={{ flex: 1 }}>
<Text style={styles.studentName}>{student.name || student.email || student.phone || 'Unknown'}</Text>
{balance && (
<>
<Text style={[styles.balanceText, { color: balance.balance < 0 ? colors.error : balance.balance > 0 ? colors.success : colors.textSecondary }]}>
{t('balance')}: {formatMoney(balance.balance)}
{balance.pendingAmount > 0 && ` (+${formatMoney(balance.pendingAmount)} ${t('pending').toLowerCase()})`}
</Text>
{balance.sessionsAttended > 0 && (
<Text style={styles.detailText}>
{balance.sessionsAttended} {t('sessions')} • {t('owed')}: {formatMoney(balance.totalOwed)} • {t('paid')}: {formatMoney(balance.totalPaid)}
</Text>
)}
</>
)}
</View>
<View style={[styles.radio, selected && styles.radioActive]} />
</TouchableOpacity>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },
header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
backBtn: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.medium },
headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
className: { fontSize: fontSize.md, color: colors.textSecondary, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
content: { padding: spacing.lg, paddingBottom: 100 },
sectionLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.md },
studentRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm, backgroundColor: colors.surfaceSecondary },
studentRowActive: { backgroundColor: colors.primaryLight, borderWidth: 1.5, borderColor: colors.primary },
studentName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
balanceText: { fontSize: fontSize.sm, marginTop: 2 },
radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border },
radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
detailText: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
}
);