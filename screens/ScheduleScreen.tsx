import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t, getLanguage } from '../lib/i18n';
import { ScreenLoader } from '../components/UI';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DAYS } from '../lib/constants';

// Get Monday of the week for a given date
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function formatDateShort(d: Date): string {
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthYear(d: Date): string {
  const lang = getLanguage();
  const months: Record<string, string[]> = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
    uz_latin: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
    uz_cyrillic: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
  };
  const m = (months[lang] || months.en)[d.getMonth()];
  return `${m} ${d.getFullYear()}`;
}

function generateTimeSlots(slots: any[]): string[] {
  if (slots.length === 0) {
    const times: string[] = [];
    for (let h = 8; h <= 18; h++) times.push(`${String(h).padStart(2, '0')}:00`);
    return times;
  }
  let minHour = 23, maxHour = 0;
  for (const slot of slots) {
    const startH = parseInt(slot.startTime.split(':')[0]);
    const endH = parseInt(slot.endTime.split(':')[0]);
    const endM = parseInt(slot.endTime.split(':')[1]);
    if (startH < minHour) minHour = startH;
    if (endH + (endM > 0 ? 1 : 0) > maxHour) maxHour = endH + (endM > 0 ? 1 : 0);
  }
  const times: string[] = [];
  for (let h = minHour; h <= maxHour; h++) times.push(`${String(h).padStart(2, '0')}:00`);
  return times;
}

const ROOM_COLORS = [
  { bg: '#E8F5EE', border: '#1B6B4A', text: '#0E4A32' },
  { bg: '#EBF4FF', border: '#3B82F6', text: '#1E40AF' },
  { bg: '#FEF3C7', border: '#D4A843', text: '#92400E' },
  { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
  { bg: '#F3E8FF', border: '#8B5CF6', text: '#5B21B6' },
  { bg: '#FFF7ED', border: '#F97316', text: '#9A3412' },
];

type RoomColor = { bg: string; border: string; text: string };

const screenWidth = Dimensions.get('window').width;
const TIME_COL_WIDTH = 40;
const DAY_COL_WIDTH = (screenWidth - TIME_COL_WIDTH - spacing.md * 2) / 7;
const HOUR_HEIGHT = 64;

export default function ScheduleScreen({ navigation }: any) {
const styles = getStyles();

  const schedule = useQuery(api.rooms.getFullSchedule);
  const rooms = useQuery(api.rooms.list);

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);

  // Room filters - null means all selected
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string> | null>(null);

  // Live clock update every 60 seconds
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const activeRooms = useMemo(() => (rooms || []).filter((r: any) => r.isActive), [rooms]);

  const roomColorMap = useMemo(() => {
    const map: Record<string, RoomColor> = {};
    activeRooms.forEach((room: any, i: number) => {
      map[room._id] = ROOM_COLORS[i % ROOM_COLORS.length];
    });
    return map;
  }, [activeRooms]);

  // Determine which rooms are visible
  const visibleRoomIds = useMemo(() => {
    if (selectedRoomIds === null) {
      return new Set(activeRooms.map((r: any) => r._id));
    }
    return selectedRoomIds;
  }, [selectedRoomIds, activeRooms]);

  // Filter schedule by visible rooms
  const filteredSchedule = useMemo(
    () => (schedule || []).filter((s: any) => visibleRoomIds.has(s.roomId)),
    [schedule, visibleRoomIds],
  );

  const timeSlots = useMemo(() => generateTimeSlots(filteredSchedule), [filteredSchedule]);

  // Week date calculations
  const currentMonday = useMemo(() => getMonday(new Date()), []);
  const viewMonday = useMemo(() => addWeeks(currentMonday, weekOffset), [currentMonday, weekOffset]);
  const viewSunday = useMemo(() => {
    const d = new Date(viewMonday);
    d.setDate(d.getDate() + 6);
    return d;
  }, [viewMonday]);

  // Today index (only valid for current week)
  const todayDayOfWeek = now.getDay();
  const todayIndex = weekOffset === 0 ? (todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1) : -1;

  // Current time indicator (only for current week)
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Check if a slot is currently happening
  const isSlotNow = (slot: any): boolean => {
    if (todayIndex < 0) return false;
    const dayIndex = DAYS.indexOf(slot.dayOfWeek);
    if (dayIndex !== todayIndex) return false;
    return slot.startTime <= nowTimeStr && slot.endTime > nowTimeStr;
  };

  const toggleRoom = useCallback((roomId: string) => {
    setSelectedRoomIds((prev: Set<string> | null) => {
      // ... existing code ...
      if (prev === null) {
        // First tap: deselect this room (show all others)
        const newSet = new Set(activeRooms.map((r: any) => r._id));
        newSet.delete(roomId);
        return newSet;
      }
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      // If all are selected, go back to null (all)
      if (next.size === activeRooms.length) return null;
      // If none are selected, keep at least the tapped one
      if (next.size === 0) {
        const s = new Set<string>();
        s.add(roomId);
        return s;
      }
      return next;
    });
  }, [activeRooms]);

  const selectAllRooms = useCallback(() => {
    setSelectedRoomIds(null);
  }, []);

  if (schedule === undefined || rooms === undefined) return <ScreenLoader />;

  const getSlotPosition = (slot: any) => {
    const dayIndex = DAYS.indexOf(slot.dayOfWeek);
    const startParts = slot.startTime.split(':');
    const endParts = slot.endTime.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    const baseMinutes = parseInt(timeSlots[0].split(':')[0]) * 60;
    const top = ((startMinutes - baseMinutes) / 60) * HOUR_HEIGHT;
    const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
    const left = dayIndex * DAY_COL_WIDTH;

    // Count how many visible slots overlap in this day/time
    const overlapping = filteredSchedule.filter((s: any) => {
      if (s.dayOfWeek !== slot.dayOfWeek) return false;
      return s.startTime < slot.endTime && s.endTime > slot.startTime;
    });
    const overlapIndex = overlapping.findIndex((s: any) => s._id === slot._id);
    const overlapCount = overlapping.length;

    const slotWidth = DAY_COL_WIDTH / overlapCount;
    const slotLeft = left + overlapIndex * slotWidth;

    return { top, height: Math.max(height, 20), left: slotLeft, width: slotWidth };
  };

  const gridHeight = (timeSlots.length - 1) * HOUR_HEIGHT;
  const allSelected = selectedRoomIds === null;
  const weekLabel = `${formatDateShort(viewMonday)} — ${formatDateShort(viewSunday)}`;
  const monthLabel = formatMonthYear(viewMonday);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>{t('schedule')}</Text>

      {/* Room filter chips */}
      {activeRooms.length > 0 && (
        <View style={styles.legend}>
          <TouchableOpacity
            style={[styles.legendItem, {
              backgroundColor: allSelected ? colors.primaryLight : colors.surfaceSecondary,
              borderColor: allSelected ? colors.primary : colors.border,
            }]}
            onPress={selectAllRooms}
            activeOpacity={0.7}
          >
            <Text style={[styles.legendText, { color: allSelected ? colors.primary : colors.textSecondary }]}>
              {t('all')}
            </Text>
          </TouchableOpacity>
          {activeRooms.map((room: any) => {
            const c = roomColorMap[room._id] || ROOM_COLORS[0];
            const isActive = visibleRoomIds.has(room._id);
            return (
              <TouchableOpacity
                key={room._id}
                style={[styles.legendItem, {
                  backgroundColor: isActive ? c.bg : colors.surfaceSecondary,
                  borderColor: isActive ? c.border : colors.border,
                  opacity: isActive ? 1 : 0.5,
                }]}
                onPress={() => toggleRoom(room._id)}
                activeOpacity={0.7}
              >
                <View style={[styles.legendDot, { backgroundColor: isActive ? c.border : colors.textTertiary }]} />
                <Text style={[styles.legendText, { color: isActive ? c.text : colors.textTertiary }]}>
                  {room.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Week navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => setWeekOffset((w: number) => w - 1)} style={styles.weekBtn} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setWeekOffset(0)}
          style={styles.weekCenter}
          activeOpacity={0.7}
        >
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setWeekOffset((w: number) => w + 1)} style={styles.weekBtn} activeOpacity={0.6}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Day headers */}
        <View style={styles.headerRow}>
          <View style={styles.timeHeaderCol} />
          {DAYS.map((day, i) => (
            <View
              key={day}
              style={[
                styles.dayHeaderCol,
                { width: DAY_COL_WIDTH },
                i === todayIndex && styles.todayHeader,
              ]}
            >
              <Text style={[
                styles.dayHeaderText,
                i === todayIndex && styles.todayHeaderText,
              ]}>
                {t(day)}
              </Text>
            </View>
          ))}
        </View>

        {/* Grid body */}
        <ScrollView
          style={styles.gridScroll}
          contentContainerStyle={{ height: gridHeight }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gridBody}>
            {/* Time labels */}
            <View style={styles.timeCol}>
              {timeSlots.slice(0, -1).map((time: string) => (
                <View key={time} style={[styles.timeRow, { height: HOUR_HEIGHT }]}>
                  <Text style={styles.timeLabel}>{time}</Text>
                </View>
              ))}
            </View>

            {/* Day columns with grid lines */}
            <View style={styles.daysGrid}>
              {timeSlots.slice(0, -1).map((_: string, i: number) => (
                <View key={`h-${i}`} style={[styles.gridLine, { top: i * HOUR_HEIGHT }]} />
              ))}
              {DAYS.map((_: string, i: number) => (
                <View
                  key={`v-${i}`}
                  style={[
                    styles.verticalLine,
                    { left: i * DAY_COL_WIDTH },
                    i === todayIndex && styles.todayColumn,
                  ]}
                />
              ))}

              {/* Schedule blocks */}
              {filteredSchedule.map((slot: any) => {
                const pos = getSlotPosition(slot);
                const c = roomColorMap[slot.roomId] || ROOM_COLORS[0];
                const isSmall = pos.height < 40;
                const isNarrow = pos.width < DAY_COL_WIDTH * 0.6;
                const isNow = isSlotNow(slot);

                return (
                  <TouchableOpacity
                    key={slot._id}
                    activeOpacity={0.7}
                    onPress={() => navigation?.navigate?.('ClassDetail', { classId: slot.classId })}
                    style={[
                      styles.slotBlock,
                      {
                        top: pos.top + 1,
                        left: pos.left + 1,
                        width: pos.width - 2,
                        height: pos.height - 2,
                        backgroundColor: c.bg,
                        borderLeftColor: c.border,
                      },
                      isNow && styles.slotBlockNow,
                    ]}
                  >
                    {isNow && (
                      <View style={styles.nowBadge}>
                        <Text style={styles.nowBadgeText}>LIVE</Text>
                      </View>
                    )}
                    <Text style={[styles.slotTime, { color: c.text }]} numberOfLines={1}>
                      {slot.startTime}
                    </Text>
                    {!isNarrow && (
                      <Text style={[styles.slotTitle, { color: c.text }]} numberOfLines={isSmall ? 1 : 2}>
                        {slot.className || slot.subjectName}
                      </Text>
                    )}
                    {!isSmall && !isNarrow && slot.teacherName && (
                      <Text style={[styles.slotTeacher, { color: c.text }]} numberOfLines={1}>
                        {slot.teacherName}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Current time indicator line */}
              {todayIndex >= 0 && timeSlots.length > 0 && (() => {
                const baseMinutes = parseInt(timeSlots[0].split(':')[0]) * 60;
                const lastMinutes = parseInt(timeSlots[timeSlots.length - 1].split(':')[0]) * 60;
                if (nowMinutes >= baseMinutes && nowMinutes <= lastMinutes) {
                  const nowTop = ((nowMinutes - baseMinutes) / 60) * HOUR_HEIGHT;
                  return (
                    <View
                      style={[
                        styles.nowLine,
                        { top: nowTop },
                      ]}
                    >
                      <View style={styles.nowDot} />
                      <View style={styles.nowLineBar} />
                    </View>
                  );
                }
                return null;
              })()}
            </View>
          </View>
        </ScrollView>

        {filteredSchedule.length === 0 && (
          <View style={styles.emptyOverlay}>
            <Text style={styles.emptyText}>{t('no_results')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles() { return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  // Room filter legend
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  // Week navigation
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  weekBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekCenter: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  weekLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  monthLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  // Day headers
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timeHeaderCol: { width: TIME_COL_WIDTH },
  dayHeaderCol: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  todayHeader: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
  },
  dayHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  todayHeaderText: { color: colors.primary },
  // Grid
  gridScroll: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  gridBody: {
    flexDirection: 'row',
    position: 'relative',
  },
  timeCol: { width: TIME_COL_WIDTH },
  timeRow: { justifyContent: 'flex-start' },
  timeLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    fontWeight: fontWeight.medium,
    marginTop: -6,
  },
  daysGrid: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  verticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.borderLight,
  },
  todayColumn: {
    backgroundColor: colors.primaryLight,
    width: DAY_COL_WIDTH,
    opacity: 0.3,
  },
  slotBlock: {
    position: 'absolute',
    borderLeftWidth: 3,
    borderRadius: 3,
    paddingHorizontal: 2,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  slotBlockNow: {
    borderLeftWidth: 4,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
    elevation: 3,
    zIndex: 10,
  },
  slotTime: {
    fontSize: 8,
    fontWeight: fontWeight.bold,
  },
  slotTitle: {
    fontSize: 8,
    fontWeight: fontWeight.semibold,
    lineHeight: 10,
  },
  slotTeacher: {
    fontSize: 7,
    opacity: 0.75,
    lineHeight: 9,
  },
  nowBadge: {
    position: 'absolute',
    top: -1,
    right: 1,
    backgroundColor: colors.error,
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  nowBadgeText: {
    fontSize: 6,
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
    letterSpacing: 0.5,
  },
  nowLine: {
    position: 'absolute',
    left: -4,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  nowLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: colors.error,
  },
  emptyOverlay: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
}); }