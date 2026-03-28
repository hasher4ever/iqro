import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { t } from '../../lib/i18n';
import { getTashkentNow, formatMoney } from '../../lib/utils';
import { NotificationBell } from '../../components/NotificationBell';
import { Card, SectionTitle, EmptyState, ScreenLoader, Badge } from '../../components/UI';
import { Ionicons } from '@expo/vector-icons';

export default function StudentDashboard({ navigation }: any) {
  const me = useQuery(api.users.me);
  const enrollments = useQuery(api.classes.listEnrollments, { status: 'approved' as any });
  const schedule = useQuery(api.rooms.getFullSchedule);

  if (me === undefined) return <ScreenLoader />;

  const myEnrollments = enrollments?.filter((e: any) => e.studentId === me?._id) || [];

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const tashkentNow = getTashkentNow();
  const today = days[tashkentNow.getUTCDay()];
  const currentMinutes = tashkentNow.getUTCHours() * 60 + tashkentNow.getUTCMinutes();

  // Get my class IDs
  const myClassIds = new Set(myEnrollments.map((e: any) => e.classId));

  // Today's schedule for my classes
  const myTodaySchedule = (schedule || []).filter((s: any) =>
    s.dayOfWeek === today && myClassIds.has(s.classId)
  ).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

  // Currently happening
  const currentSlot = myTodaySchedule.find((s: any) => {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    return currentMinutes >= sh * 60 + sm && currentMinutes < eh * 60 + em;
  });

  // Next upcoming
  const nextSlot = myTodaySchedule.find((s: any) => {
    const [sh, sm] = s.startTime.split(':').map(Number);
    return currentMinutes < sh * 60 + sm;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{t('dashboard')}</Text>
            <Text style={styles.subtitle}>{t('welcome')}, {me?.name || ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <NotificationBell />
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Ionicons name="person-circle-outline" size={32} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Currently happening */}
        {currentSlot && (
          <TouchableOpacity
            style={styles.liveCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ClassDetail', { classId: currentSlot.classId, className: currentSlot.className })}
          >
            <View style={styles.liveBadgeRow}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
              <Text style={styles.liveTime}>{currentSlot.startTime} - {currentSlot.endTime}</Text>
            </View>
            <Text style={styles.liveClassName}>{currentSlot.className || currentSlot.subjectName}</Text>
            <Text style={styles.liveSubject}>{currentSlot.teacherName} • {currentSlot.roomName}</Text>
          </TouchableOpacity>
        )}

        {/* Next class */}
        {nextSlot && !currentSlot && (
          <View style={styles.nextCard}>
            <Text style={styles.nextLabel}>{t('todays_classes')}</Text>
            <Text style={styles.nextClassName}>{nextSlot.className || nextSlot.subjectName}</Text>
            <Text style={styles.nextTime}>{nextSlot.startTime} - {nextSlot.endTime} • {nextSlot.roomName}</Text>
          </View>
        )}

        {/* My Courses */}
        <SectionTitle title={t('classes')} />
        {myEnrollments.length === 0 ? (
          <>
            <EmptyState message={t('no_data')} />
            <TouchableOpacity
              style={styles.catalogBtn}
              onPress={() => navigation.navigate('Classes')}
            >
              <Text style={styles.catalogBtnText}>{t('view_all')} {t('classes')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          myEnrollments.map((enrollment: any) => (
            <StudentClassCard
              key={enrollment._id}
              enrollment={enrollment}
              studentId={me!._id}
              navigation={navigation}
              today={today}
              currentMinutes={currentMinutes}
            />
          ))
        )}

        {/* Today's remaining schedule */}
        {myTodaySchedule.length > 0 && (
          <>
            <SectionTitle title={t('schedule')} />
            {myTodaySchedule.map((slot: any, idx: number) => {
              const [sh, sm] = slot.startTime.split(':').map(Number);
              const [eh, em] = slot.endTime.split(':').map(Number);
              const isPast = currentMinutes >= eh * 60 + em;
              const isCurrent = currentMinutes >= sh * 60 + sm && currentMinutes < eh * 60 + em;
              return (
                <View key={slot._id} style={[styles.schedRow, isPast && styles.schedRowPast, isCurrent && styles.schedRowCurrent]}>
                  <View style={styles.schedTime}>
                    <Text style={[styles.schedTimeText, isPast && styles.schedTimePast]}>{slot.startTime}</Text>
                    <Text style={[styles.schedTimeText, styles.schedTimeSm, isPast && styles.schedTimePast]}>{slot.endTime}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.schedName, isPast && { color: colors.textTertiary }]}>
                      {slot.className || slot.subjectName}
                    </Text>
                    <Text style={styles.schedSub}>{slot.teacherName} • {slot.roomName}</Text>
                  </View>
                  {isCurrent && (
                    <View style={styles.liveDotSmall} />
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* Browse classes */}
        {myEnrollments.length > 0 && (
          <TouchableOpacity
            style={styles.catalogBtn}
            onPress={() => navigation.navigate('Classes')}
          >
            <Text style={styles.catalogBtnText}>{t('view_all')} {t('classes')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StudentClassCard({ enrollment, studentId, navigation, today, currentMinutes }: any) {
  const stats = useQuery(api.attendance.getStudentAttendanceStats, {
    studentId,
    classId: enrollment.classId,
  });
  const balance = useQuery(api.transactions.getStudentClassBalance, {
    studentId,
    classId: enrollment.classId,
  });

  return (
    <TouchableOpacity
      style={styles.classCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('ClassDetail', {
        classId: enrollment.classId,
        className: enrollment.className,
      })}
    >
      <Text style={styles.cardClassName}>{enrollment.className}</Text>

      <View style={styles.cardStats}>
        {stats && (
          <View style={styles.cardStat}>
            <Text style={styles.cardStatLabel}>{t('attendance')}</Text>
            <Text style={[styles.cardStatValue, { color: stats.percentage >= 70 ? colors.success : colors.error }]}>
              {stats.percentage}%
            </Text>
          </View>
        )}
        {stats && (
          <View style={styles.cardStat}>
            <Text style={styles.cardStatLabel}>{t('present')}</Text>
            <Text style={styles.cardStatValue}>{stats.present}/{stats.total}</Text>
          </View>
        )}
        {balance && (
          <View style={styles.cardStat}>
            <Text style={styles.cardStatLabel}>{t('balance')}</Text>
            <Text style={[styles.cardStatValue, {
              color: balance.balance < 0 ? colors.error : balance.balance > 0 ? colors.success : colors.textSecondary,
            }]}>
              {formatMoney(balance.balance)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.cardBtn}
          onPress={() => navigation.navigate('GradesScreen', { classId: enrollment.classId, className: enrollment.className })}
        >
          <Ionicons name="star-outline" size={14} color={colors.primary} />
          <Text style={styles.cardBtnText}>{t('grades')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cardBtn}
          onPress={() => navigation.navigate('PaymentScreen', { classId: enrollment.classId, className: enrollment.className })}
        >
          <Ionicons name="card-outline" size={14} color={colors.primary} />
          <Text style={styles.cardBtnText}>{t('payment')}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 100 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 2 },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  // Live card
  liveCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  liveBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', marginRight: 4 },
  liveBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#fff' },
  liveTime: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)' },
  liveClassName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: '#fff' },
  liveSubject: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  // Next class
  nextCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  nextLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary, textTransform: 'uppercase', marginBottom: spacing.xs },
  nextClassName: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
  nextTime: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },

  // Class card
  classCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardClassName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.sm },
  cardStats: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.sm },
  cardStat: {},
  cardStatLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  cardStatValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: 1 },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  cardBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },

  // Schedule rows
  schedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  schedRowPast: { opacity: 0.5 },
  schedRowCurrent: { borderLeftWidth: 3, borderLeftColor: colors.error },
  schedTime: { width: 50, marginRight: spacing.md },
  schedTimeText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  schedTimeSm: { fontSize: fontSize.xs, color: colors.textTertiary, fontWeight: fontWeight.regular as any },
  schedTimePast: { color: colors.textTertiary },
  schedName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  schedSub: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
  liveDotSmall: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },

  // Catalog
  catalogBtn: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  catalogBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.primary },
});

