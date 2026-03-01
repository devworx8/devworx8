import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, pickSectionError } from '@/hooks/useFinanceControlCenter';
import type { FinanceControlCenterBundle } from '@/types/finance';

interface FinanceOverviewTabProps {
  bundle: FinanceControlCenterBundle | null;
  snapshot: FinanceControlCenterBundle['snapshot'] | null;
  derivedOverview: {
    due: number;
    collected: number;
    collectedAllocated: number;
    collectedSource: string;
    outstanding: number;
    expenses: number;
    pettyCashExpenses: number;
    financialExpenses: number;
    expenseEntries: number;
    netAfterExpenses: number;
    pendingAmount: number;
    overdueAmount: number;
    pendingStudents: number;
    overdueStudents: number;
    pendingCount: number;
    overdueCount: number;
    pendingPOPs: number;
    prepaid: number;
    payrollDue: number;
    payrollPaid: number;
    kpiCorrelated: boolean;
    kpiDelta: number;
    allocationGap: number;
    snapshotAsOf: string | null;
  };
  monthLabel: string;
  theme: any;
  styles: any;
  renderSectionError: (message: string | null) => React.ReactNode;
}

export function FinanceOverviewTab({
  bundle,
  snapshot,
  derivedOverview,
  monthLabel,
  theme,
  styles,
  renderSectionError,
}: FinanceOverviewTabProps) {
  const collectionRate = derivedOverview.due > 0
    ? Math.round((derivedOverview.collected / derivedOverview.due) * 100)
    : 0;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{monthLabel} — At a Glance</Text>
      {renderSectionError(pickSectionError(bundle?.errors, 'snapshot'))}
      {renderSectionError(pickSectionError(bundle?.errors, 'expenses'))}

      {/* Hero: Expected vs Collected */}
      <View style={[styles.metricCard, { borderLeftWidth: 4, borderLeftColor: theme.primary, marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <Text style={[styles.metricLabel, { fontSize: 14 }]}>Expected Income</Text>
          <Text style={[styles.metricValue, { fontSize: 22 }]}>{formatCurrency(derivedOverview.due)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <Text style={[styles.metricLabel, { fontSize: 14 }]}>Collected</Text>
          <Text style={[styles.metricValue, { fontSize: 22, color: theme.success }]}>{formatCurrency(derivedOverview.collected)}</Text>
        </View>
        <View style={{ height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
          <View style={{ width: `${Math.min(collectionRate, 100)}%`, height: '100%', backgroundColor: collectionRate >= 80 ? theme.success : collectionRate >= 50 ? theme.warning || '#F59E0B' : theme.error, borderRadius: 4 }} />
        </View>
        <Text style={[styles.metricLabel, { marginTop: 6, textAlign: 'right' }]}>{collectionRate}% collected</Text>
      </View>

      {/* Key numbers grid */}
      <View style={styles.cardGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Outstanding</Text>
          <Text style={[styles.metricValue, { color: theme.error }]}>{formatCurrency(derivedOverview.outstanding)}</Text>
          <Text style={[styles.metricLabel, { fontSize: 11, marginTop: 2 }]}>{derivedOverview.pendingStudents + derivedOverview.overdueStudents} families</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Overdue</Text>
          <Text style={[styles.metricValue, { color: '#EF4444' }]}>{formatCurrency(derivedOverview.overdueAmount)}</Text>
          <Text style={[styles.metricLabel, { fontSize: 11, marginTop: 2 }]}>{derivedOverview.overdueStudents} families</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Pending POPs</Text>
          <Text style={[styles.metricValue, { color: theme.warning || '#F59E0B' }]}>{derivedOverview.pendingPOPs}</Text>
          <Text style={[styles.metricLabel, { fontSize: 11, marginTop: 2 }]}>to verify</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Net Income</Text>
          <Text style={[styles.metricValue, { color: derivedOverview.netAfterExpenses >= 0 ? theme.success : theme.error }]}>
            {formatCurrency(derivedOverview.netAfterExpenses)}
          </Text>
          <Text style={[styles.metricLabel, { fontSize: 11, marginTop: 2 }]}>after expenses</Text>
        </View>
      </View>

      {snapshot && !derivedOverview.kpiCorrelated && (
        <View style={styles.errorCard}>
          <Ionicons name="analytics-outline" size={16} color={theme.warning || '#F59E0B'} />
          <Text style={styles.errorText}>
            KPI variance: {formatCurrency(derivedOverview.kpiDelta)} difference detected.
          </Text>
        </View>
      )}

      {/* Receivables summary */}
      <View style={styles.calloutCard}>
        <Text style={styles.calloutTitle}>Receivables Summary</Text>
        <Text style={styles.calloutText}>
          {derivedOverview.pendingStudents} pending ({derivedOverview.pendingCount} fees) · {derivedOverview.overdueStudents} overdue ({derivedOverview.overdueCount} fees)
        </Text>
      </View>

      {/* Payroll and expenses */}
      <View style={styles.calloutCard}>
        <Text style={styles.calloutTitle}>Payroll</Text>
        <Text style={styles.calloutText}>
          Due {formatCurrency(derivedOverview.payrollDue)} · Paid {formatCurrency(derivedOverview.payrollPaid)}
        </Text>
      </View>

      <View style={styles.calloutCard}>
        <Text style={styles.calloutTitle}>Expenses</Text>
        <Text style={styles.calloutText}>
          Petty cash {formatCurrency(derivedOverview.pettyCashExpenses)} · Logged {formatCurrency(derivedOverview.financialExpenses)} · {derivedOverview.expenseEntries} entries
        </Text>
      </View>

      {snapshot && (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            Data scoped to {monthLabel} as of {new Date(derivedOverview.snapshotAsOf || Date.now()).toLocaleDateString('en-ZA')}.
          </Text>
        </View>
      )}
    </View>
  );
}
