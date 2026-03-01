import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatCurrency, pickSectionError } from '@/hooks/useFinanceControlCenter';
import type { FinanceControlCenterBundle } from '@/types/finance';

interface FinanceReceivablesTabProps {
  bundle: FinanceControlCenterBundle | null;
  receivables: FinanceControlCenterBundle['receivables'] | null;
  monthIso: string;
  theme: any;
  styles: any;
  renderSectionError: (message: string | null) => React.ReactNode;
}

export function FinanceReceivablesTab({
  bundle,
  receivables,
  monthIso,
  theme,
  styles,
  renderSectionError,
}: FinanceReceivablesTabProps) {
  const router = useRouter();

  const { overdueStudents, pendingStudents, totalOutstanding } = useMemo(() => {
    if (!receivables?.students) return { overdueStudents: [], pendingStudents: [], totalOutstanding: 0 };
    const overdue = receivables.students.filter((r: any) => r.overdue_count > 0);
    const pending = receivables.students.filter((r: any) => r.overdue_count === 0 && r.pending_count > 0);
    const total = receivables.students.reduce((s: number, r: any) => s + Number(r.outstanding_amount || 0), 0);
    return { overdueStudents: overdue, pendingStudents: pending, totalOutstanding: total };
  }, [receivables]);

  const renderStudentRow = (row: any) => {
    const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Student';
    const isOverdue = row.overdue_count > 0;
    const className = row.class_name || '';
    return (
      <TouchableOpacity
        key={row.student_id}
        style={[styles.queueCard, isOverdue && { borderLeftWidth: 3, borderLeftColor: '#EF4444' }]}
        onPress={() => router.push(
          `/screens/principal-student-fees?studentId=${row.student_id}&monthIso=${monthIso}&source=receivables` as any
        )}
      >
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.queueTitle}>{fullName}</Text>
            {className ? <Text style={[styles.queueSubtitle, { fontSize: 12, color: theme.textSecondary, marginTop: 2 }]}>{className}</Text> : null}
          </View>
          <Text style={[styles.breakdownValue, isOverdue && { color: '#EF4444' }]}>
            {formatCurrency(row.outstanding_amount)}
          </Text>
        </View>
        <View style={styles.badgeRow}>
          {row.overdue_count > 0 && (
            <View style={[styles.statusBadge, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="alert-circle" size={12} color="#EF4444" />
              <Text style={[styles.statusBadgeText, { color: '#EF4444', marginLeft: 4 }]}>
                {row.overdue_count} overdue
              </Text>
            </View>
          )}
          {row.pending_count > 0 && (
            <View style={[styles.statusBadge, { backgroundColor: (theme.warning || '#F59E0B') + '20' }]}>
              <Ionicons name="time-outline" size={12} color={theme.warning || '#F59E0B'} />
              <Text style={[styles.statusBadgeText, { color: theme.warning || '#F59E0B', marginLeft: 4 }]}>
                {row.pending_count} pending
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Receivables</Text>
      {renderSectionError(pickSectionError(bundle?.errors, 'receivables'))}

      {/* Summary banner */}
      {receivables && receivables.students.length > 0 && (
        <View style={[styles.calloutCard, { marginBottom: 16 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={styles.calloutTitle}>Total Outstanding</Text>
            <Text style={[styles.calloutTitle, { color: theme.error }]}>{formatCurrency(totalOutstanding)}</Text>
          </View>
          <Text style={styles.calloutText}>
            {receivables.students.length} {receivables.students.length === 1 ? 'child' : 'children'} with unpaid fees · {overdueStudents.length} overdue · {pendingStudents.length} pending
          </Text>
        </View>
      )}

      {!!receivables && (
        (() => {
          const excludedInactive = Number(receivables.summary?.excluded_inactive_students || 0);
          const excludedFuture = Number(receivables.summary?.excluded_future_enrollment_students || 0);
          const excludedUnverified = Number(receivables.summary?.excluded_unverified_students || 0);
          const totalExcluded = excludedInactive + excludedFuture + excludedUnverified;
          if (totalExcluded <= 0) return null;
          return (
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>
                Excluded: {excludedFuture} not started, {excludedUnverified} unverified, {excludedInactive} inactive
              </Text>
            </View>
          );
        })()
      )}

      {!receivables || receivables.students.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle" size={32} color={theme.success} style={{ textAlign: 'center', marginBottom: 8 }} />
          <Text style={[styles.emptyText, { textAlign: 'center' }]}>All fees collected for this month!</Text>
        </View>
      ) : (
        <>
          {/* Overdue section */}
          {overdueStudents.length > 0 && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 }}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={[styles.sectionTitle, { fontSize: 15, color: '#EF4444', marginBottom: 0 }]}>
                  Overdue ({overdueStudents.length})
                </Text>
              </View>
              {overdueStudents.map(renderStudentRow)}
            </>
          )}

          {/* Pending section */}
          {pendingStudents.length > 0 && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: overdueStudents.length > 0 ? 16 : 4 }}>
                <Ionicons name="time-outline" size={16} color={theme.warning || '#F59E0B'} />
                <Text style={[styles.sectionTitle, { fontSize: 15, color: theme.warning || '#F59E0B', marginBottom: 0 }]}>
                  Pending ({pendingStudents.length})
                </Text>
              </View>
              {pendingStudents.map(renderStudentRow)}
            </>
          )}
        </>
      )}
    </View>
  );
}
