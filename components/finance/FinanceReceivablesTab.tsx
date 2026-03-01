import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { assertSupabase } from '@/lib/supabase';
import { formatCurrency, pickSectionError } from '@/hooks/useFinanceControlCenter';
import type { FinanceControlCenterBundle } from '@/types/finance';

interface FinanceReceivablesTabProps {
  bundle: FinanceControlCenterBundle | null;
  receivables: FinanceControlCenterBundle['receivables'] | null;
  monthIso: string;
  organizationId?: string;
  theme: any;
  styles: any;
  renderSectionError: (message: string | null) => React.ReactNode;
}

export function FinanceReceivablesTab({
  bundle,
  receivables,
  monthIso,
  organizationId,
  theme,
  styles,
  renderSectionError,
}: FinanceReceivablesTabProps) {
  const router = useRouter();

  const { data: allStudentsFees } = useQuery({
    queryKey: ['receivables-all-students', organizationId, monthIso],
    queryFn: async () => {
      if (!organizationId) return null;
      const supabase = assertSupabase();
      const { data } = await supabase
        .from('student_fees')
        .select('student_id, status, final_amount, amount, amount_paid, amount_outstanding, students!inner(id, first_name, last_name, is_active, status)')
        .or(`preschool_id.eq.${organizationId},organization_id.eq.${organizationId}`, { foreignTable: 'students' })
        .eq('billing_month', monthIso)
        .eq('students.is_active', true)
        .eq('students.status', 'active');

      if (!data) return null;

      const byStudent = new Map<string, { name: string; studentId: string; totalDue: number; totalPaid: number; status: 'paid' | 'partial' | 'unpaid' }>();
      for (const fee of data as any[]) {
        const s = fee.students;
        const sid = fee.student_id;
        const existing = byStudent.get(sid) || { name: `${s?.first_name || ''} ${s?.last_name || ''}`.trim(), studentId: sid, totalDue: 0, totalPaid: 0, status: 'paid' as const };
        existing.totalDue += Number(fee.final_amount || fee.amount || 0);
        existing.totalPaid += Number(fee.amount_paid || 0);
        if (fee.status === 'waived') { /* skip */ }
        else if (fee.status !== 'paid') existing.status = fee.status === 'partially_paid' ? 'partial' : 'unpaid';
        byStudent.set(sid, existing);
      }

      const list = [...byStudent.values()].sort((a, b) => {
        if (a.status === 'paid' && b.status !== 'paid') return 1;
        if (a.status !== 'paid' && b.status === 'paid') return -1;
        return (b.totalDue - b.totalPaid) - (a.totalDue - a.totalPaid);
      });

      const totalExpected = list.reduce((s, r) => s + r.totalDue, 0);
      const totalCollected = list.reduce((s, r) => s + r.totalPaid, 0);
      const paidCount = list.filter(r => r.status === 'paid').length;
      const unpaidCount = list.filter(r => r.status !== 'paid').length;

      return { students: list, totalExpected, totalCollected, paidCount, unpaidCount };
    },
    enabled: !!organizationId,
  });

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

      {/* School totals banner */}
      {allStudentsFees && (
        <View style={[styles.calloutCard, { marginBottom: 8, borderLeftWidth: 4, borderLeftColor: theme.primary }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={styles.calloutTitle}>Expected (all {allStudentsFees.students.length} children)</Text>
            <Text style={[styles.calloutTitle, { color: theme.primary }]}>{formatCurrency(allStudentsFees.totalExpected)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={styles.calloutText}>Collected</Text>
            <Text style={[styles.calloutText, { color: theme.success, fontWeight: '600' }]}>{formatCurrency(allStudentsFees.totalCollected)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={styles.calloutText}>Outstanding</Text>
            <Text style={[styles.calloutText, { color: theme.error, fontWeight: '600' }]}>{formatCurrency(allStudentsFees.totalExpected - allStudentsFees.totalCollected)}</Text>
          </View>
          <Text style={[styles.calloutText, { marginTop: 4 }]}>
            {allStudentsFees.paidCount} paid · {allStudentsFees.unpaidCount} unpaid
          </Text>
        </View>
      )}

      {/* Unpaid summary */}
      {receivables && receivables.students.length > 0 && (
        <View style={[styles.calloutCard, { marginBottom: 16 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={styles.calloutTitle}>Unpaid Total</Text>
            <Text style={[styles.calloutTitle, { color: theme.error }]}>{formatCurrency(totalOutstanding)}</Text>
          </View>
          <Text style={styles.calloutText}>
            {overdueStudents.length} overdue · {pendingStudents.length} pending
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

      {/* Full student roster with paid/unpaid status */}
      {allStudentsFees && allStudentsFees.students.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 20 }}>
            <Ionicons name="people" size={16} color={theme.primary} />
            <Text style={[styles.sectionTitle, { fontSize: 15, color: theme.primary, marginBottom: 0 }]}>
              All Students ({allStudentsFees.students.length})
            </Text>
          </View>
          {allStudentsFees.students.map((s) => {
            const isPaid = s.status === 'paid';
            const isPartial = s.status === 'partial';
            return (
              <TouchableOpacity
                key={s.studentId}
                style={[styles.queueCard, { borderLeftWidth: 3, borderLeftColor: isPaid ? theme.success : isPartial ? theme.warning || '#F59E0B' : theme.error }]}
                onPress={() => router.push(
                  `/screens/principal-student-fees?studentId=${s.studentId}&monthIso=${monthIso}&source=receivables` as any
                )}
              >
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.queueTitle}>{s.name || 'Student'}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                      Due: {formatCurrency(s.totalDue)} · Paid: {formatCurrency(s.totalPaid)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: isPaid ? theme.success + '20' : isPartial ? (theme.warning || '#F59E0B') + '20' : theme.error + '20' }]}>
                    <Ionicons
                      name={isPaid ? 'checkmark-circle' : isPartial ? 'pie-chart-outline' : 'close-circle'}
                      size={14}
                      color={isPaid ? theme.success : isPartial ? theme.warning || '#F59E0B' : theme.error}
                    />
                    <Text style={[styles.statusBadgeText, { color: isPaid ? theme.success : isPartial ? theme.warning || '#F59E0B' : theme.error, marginLeft: 4 }]}>
                      {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Not Paid'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </View>
  );
}
