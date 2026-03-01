/**
 * Parent Timetable Screen
 *
 * Shows the weekly timetable for the active child based on their class.
 * Fetches from timetable_slots filtered by class_id and school_id.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SubPageHeader } from '@/components/SubPageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { assertSupabase } from '@/lib/supabase';
import EduDashSpinner from '@/components/ui/EduDashSpinner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

interface TimetableSlot {
  id: string;
  day_of_week: string;
  period_number: number;
  start_time: string;
  end_time: string;
  subject: string;
  teacher_name: string;
  room: string;
  is_break: boolean;
  activity_type: string;
}

export default function ParentTimetableScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);

  const todayIndex = new Date().getDay();
  const initialDay = todayIndex >= 1 && todayIndex <= 5 ? todayIndex - 1 : 0;
  const [selectedDayIndex, setSelectedDayIndex] = useState(initialDay);

  const p = profile as unknown as Record<string, unknown> | undefined;
  const orgMembership = p?.organization_membership as Record<string, string> | undefined;
  const organizationId = orgMembership?.organization_id ?? (p?.organization_id as string) ?? (p?.preschool_id as string);

  const { data: slots = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['parent-timetable', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const supabase = assertSupabase();

      const { data: children } = await supabase
        .from('students')
        .select('id, class_id')
        .eq('parent_id', profile?.id || '')
        .eq('is_active', true)
        .limit(1);

      const classId = children?.[0]?.class_id;
      if (!classId) return [];

      const { data, error } = await supabase
        .from('timetable_slots')
        .select('*')
        .eq('class_id', classId)
        .order('period_number', { ascending: true });

      if (error) return [];
      return (data || []) as TimetableSlot[];
    },
    enabled: !!organizationId && !!profile?.id,
  });

  const daySlots = useMemo(() => {
    const selectedDay = DAYS[selectedDayIndex].toLowerCase();
    return slots
      .filter((s) => s.day_of_week?.toLowerCase() === selectedDay)
      .sort((a, b) => a.period_number - b.period_number);
  }, [slots, selectedDayIndex]);

  const formatTime = (time: string) => {
    if (!time) return '';
    return time.slice(0, 5);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SubPageHeader title={t('parent.timetable', { defaultValue: 'Class Timetable' })} />

      {/* Day selector */}
      <View style={styles.daySelector}>
        {DAYS.map((day, idx) => {
          const isSelected = idx === selectedDayIndex;
          const isToday = idx === todayIndex - 1;
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayTab, isSelected && styles.dayTabActive]}
              onPress={() => setSelectedDayIndex(idx)}
            >
              <Text style={[styles.dayTabText, isSelected && styles.dayTabTextActive]}>
                {day.slice(0, 3)}
              </Text>
              {isToday && <View style={[styles.todayDot, isSelected && { backgroundColor: '#fff' }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <EduDashSpinner size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => refetch()} />}
          showsVerticalScrollIndicator={false}
        >
          {daySlots.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={theme.textSecondary} />
              <Text style={styles.emptyTitle}>
                {slots.length === 0
                  ? t('parent.timetable_not_set', { defaultValue: 'Timetable not set up yet' })
                  : t('parent.no_classes_day', { defaultValue: 'No classes on this day' })}
              </Text>
              {slots.length === 0 && (
                <Text style={styles.emptySubtitle}>
                  {t('parent.timetable_contact', { defaultValue: 'Contact your school to set up the timetable.' })}
                </Text>
              )}
            </View>
          ) : (
            daySlots.map((slot, index) => (
              <View
                key={slot.id || `${slot.day_of_week}-${slot.period_number}`}
                style={[styles.slotCard, slot.is_break && styles.slotCardBreak]}
              >
                <View style={styles.timeColumn}>
                  <Text style={[styles.timeText, slot.is_break && { color: theme.textSecondary }]}>
                    {formatTime(slot.start_time)}
                  </Text>
                  <View style={styles.timeLine} />
                  <Text style={[styles.timeTextEnd, slot.is_break && { color: theme.textSecondary }]}>
                    {formatTime(slot.end_time)}
                  </Text>
                </View>
                <View style={styles.slotContent}>
                  <View style={styles.slotHeader}>
                    <Ionicons
                      name={slot.is_break ? 'cafe-outline' : 'book-outline'}
                      size={16}
                      color={slot.is_break ? theme.textSecondary : theme.primary}
                    />
                    <Text style={[styles.subjectText, slot.is_break && { color: theme.textSecondary, fontStyle: 'italic' }]}>
                      {slot.is_break ? (slot.subject || 'Break') : slot.subject}
                    </Text>
                  </View>
                  {!slot.is_break && (
                    <View style={styles.slotMeta}>
                      {slot.teacher_name ? (
                        <View style={styles.metaRow}>
                          <Ionicons name="person-outline" size={12} color={theme.textSecondary} />
                          <Text style={styles.metaText}>{slot.teacher_name}</Text>
                        </View>
                      ) : null}
                      {slot.room ? (
                        <View style={styles.metaRow}>
                          <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
                          <Text style={styles.metaText}>{slot.room}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
                <Text style={styles.periodBadge}>P{slot.period_number}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    daySelector: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 6 },
    dayTab: {
      flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12,
      backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    },
    dayTabActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    dayTabText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
    dayTabTextActive: { color: '#fff' },
    todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.primary, marginTop: 3 },
    scrollContent: { paddingHorizontal: 16, gap: 2 },
    emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
    emptySubtitle: { fontSize: 13, color: theme.textSecondary, textAlign: 'center' },
    slotCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.surface, borderRadius: 14, padding: 14,
      marginBottom: 8, borderWidth: 1, borderColor: theme.border, gap: 12,
    },
    slotCardBreak: { backgroundColor: theme.background, borderStyle: 'dashed' },
    timeColumn: { alignItems: 'center', width: 50 },
    timeText: { fontSize: 13, fontWeight: '700', color: theme.primary },
    timeTextEnd: { fontSize: 11, color: theme.textSecondary },
    timeLine: { width: 1, height: 12, backgroundColor: theme.border, marginVertical: 2 },
    slotContent: { flex: 1 },
    slotHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    subjectText: { fontSize: 15, fontWeight: '600', color: theme.text },
    slotMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { fontSize: 12, color: theme.textSecondary },
    periodBadge: {
      fontSize: 11, fontWeight: '700', color: theme.textSecondary,
      backgroundColor: theme.border + '60', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
  });
