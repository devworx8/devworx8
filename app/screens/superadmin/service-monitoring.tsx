// service-monitoring.tsx
// Superadmin dashboard for external service monitoring
// Docs: https://reactnative.dev/docs/0.79/getting-started
//       https://docs.expo.dev/router/introduction/
//       https://tanstack.com/query/v5/docs/framework/react/overview

import React, { useMemo } from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMonthlyServiceCosts, useServiceHealthSummary } from "@/hooks/superadmin/useServiceHealthData";
import { ServiceStatusGrid } from "@/components/superadmin/ServiceStatusGrid";
import type { ServiceHealth } from "@/hooks/superadmin/useServiceHealthData";

import EduDashSpinner from '@/components/ui/EduDashSpinner';
export default function ServiceMonitoringScreen() {
  const { data: services, summary, isLoading, refetch, isRefetching } = useServiceHealthSummary();
  const targetMonth = useMemo(() => new Date(), []);
  const {
    data: monthlyCosts,
    isLoading: isCostLoading,
    refetch: refetchCosts,
    isRefetching: isRefetchingCosts,
  } = useMonthlyServiceCosts(targetMonth);

  const monthLabel = useMemo(
    () =>
      targetMonth.toLocaleDateString("en-ZA", {
        month: "long",
        year: "numeric",
      }),
    [targetMonth],
  );

  const totalCostUsd = useMemo(
    () => (monthlyCosts || []).reduce((sum, row) => sum + Number(row.total_cost_usd || 0), 0),
    [monthlyCosts],
  );
  const totalCostZar = useMemo(
    () => (monthlyCosts || []).reduce((sum, row) => sum + Number(row.total_cost_zar || 0), 0),
    [monthlyCosts],
  );

  const handleServicePress = (_service: ServiceHealth) => {
    // TODO: Open detail modal
  };

  const handleRefresh = () => {
    void Promise.all([refetch(), refetchCosts()]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <EduDashSpinner size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading service status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || isRefetchingCosts}
            onRefresh={handleRefresh}
            colors={["#3b82f6"]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Service Monitoring</Text>
          <Text style={styles.subtitle}>
            Real-time health status of all external services
          </Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>Total Services</Text>
          </View>

          <View style={[styles.summaryCard, styles.healthyCard]}>
            <Text style={[styles.summaryValue, styles.healthyText]}>
              {summary.healthy}
            </Text>
            <Text style={styles.summaryLabel}>Healthy</Text>
          </View>

          <View style={[styles.summaryCard, styles.degradedCard]}>
            <Text style={[styles.summaryValue, styles.degradedText]}>
              {summary.degraded}
            </Text>
            <Text style={styles.summaryLabel}>Degraded</Text>
          </View>

          <View style={[styles.summaryCard, styles.downCard]}>
            <Text style={[styles.summaryValue, styles.downText]}>
              {summary.down}
            </Text>
            <Text style={styles.summaryLabel}>Down</Text>
          </View>
        </View>

        {/* Service Grid */}
        <View style={styles.gridContainer}>
          <Text style={styles.sectionTitle}>Service Status</Text>
          {services && services.length > 0 ? (
            <ServiceStatusGrid
              services={services}
              onServicePress={handleServicePress}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No services found. Run health checks to populate data.
              </Text>
            </View>
          )}
        </View>

        {/* Cost Overview */}
        <View style={styles.section}>
          <View style={styles.costHeader}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>Monthly Costs</Text>
            <Text style={styles.costMonthLabel}>{monthLabel}</Text>
          </View>

          {isCostLoading ? (
            <View style={styles.placeholderCard}>
              <EduDashSpinner size="small" color="#3b82f6" />
              <Text style={[styles.placeholderText, styles.loadingInlineText]}>Loading cost data...</Text>
            </View>
          ) : monthlyCosts && monthlyCosts.length > 0 ? (
            <View style={styles.costCard}>
              <View style={styles.costSummaryRow}>
                <View>
                  <Text style={styles.costSummaryLabel}>Estimated Total (USD)</Text>
                  <Text style={styles.costSummaryValue}>${totalCostUsd.toFixed(4)}</Text>
                </View>
                <View style={styles.costSummaryDivider} />
                <View>
                  <Text style={styles.costSummaryLabel}>Estimated Total (ZAR)</Text>
                  <Text style={styles.costSummaryValue}>R {totalCostZar.toFixed(2)}</Text>
                </View>
              </View>

              {monthlyCosts.map((row) => {
                const serviceName = row.service_name.replace(/[:_]+/g, " ").replace(/\s+/g, " ").trim();
                return (
                  <View key={row.service_name} style={styles.costRow}>
                    <View style={styles.costMeta}>
                      <Text style={styles.costServiceName}>{serviceName}</Text>
                      <Text style={styles.costServiceSubtext}>
                        {row.preschool_count} school{row.preschool_count === 1 ? "" : "s"}
                      </Text>
                    </View>
                    <View style={styles.costAmounts}>
                      <Text style={styles.costUsd}>${Number(row.total_cost_usd || 0).toFixed(4)}</Text>
                      <Text style={styles.costZar}>R {Number(row.total_cost_zar || 0).toFixed(2)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderText}>
                No cost records yet for {monthLabel}. Run the cost aggregator to populate this section.
              </Text>
            </View>
          )}
        </View>

        {/* API Keys Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Keys Status</Text>
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>
              🔑 API key monitoring will be available once keys are configured in the database.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  header: {
    padding: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  summaryContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  healthyCard: {
    borderTopWidth: 3,
    borderTopColor: "#10b981",
  },
  degradedCard: {
    borderTopWidth: 3,
    borderTopColor: "#f59e0b",
  },
  downCard: {
    borderTopWidth: 3,
    borderTopColor: "#ef4444",
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  healthyText: {
    color: "#10b981",
  },
  degradedText: {
    color: "#f59e0b",
  },
  downText: {
    color: "#ef4444",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  gridContainer: {
    padding: 16,
  },
  section: {
    padding: 16,
  },
  costHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  costMonthLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  sectionTitleInline: {
    marginBottom: 0,
  },
  costCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 10,
  },
  costSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },
  costSummaryLabel: {
    fontSize: 11,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  costSummaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  costSummaryDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#eef2f7",
    marginHorizontal: 12,
  },
  costRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  costMeta: {
    flex: 1,
    paddingRight: 10,
  },
  costServiceName: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  costServiceSubtext: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 1,
  },
  costAmounts: {
    alignItems: "flex-end",
  },
  costUsd: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "700",
  },
  costZar: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 1,
  },
  emptyState: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  placeholderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  placeholderText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  loadingInlineText: {
    marginTop: 8,
  },
});
