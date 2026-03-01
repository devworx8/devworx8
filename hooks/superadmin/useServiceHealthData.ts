// useServiceHealthData.ts
// Custom hook for fetching service health monitoring data
// Docs: https://tanstack.com/query/v5/docs/framework/react/overview
//       https://supabase.com/docs/reference/javascript/select

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ServiceHealth {
  id: string;
  service_name: string;
  service_category: string;
  status: "healthy" | "degraded" | "down" | "maintenance" | "unknown";
  response_time_ms: number | null;
  error_rate_percent: number;
  circuit_state: "closed" | "open" | "half_open";
  last_checked_at: string;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  metadata: Record<string, unknown>;
}

export interface MonthlyServiceCost {
  service_name: string;
  total_cost_usd: number;
  total_cost_zar: number;
  total_usage_units: Record<string, unknown> | null;
  preschool_count: number;
}

export function useServiceHealthData() {
  return useQuery({
    queryKey: ["service-health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_health_status")
        .select("*")
        .order("service_name");

      if (error) throw error;
      return data as ServiceHealth[];
    },
    refetchInterval: 60000, // Refetch every 60 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

export function useServiceHealthSummary() {
  const { data: services, ...rest } = useServiceHealthData();

  const summary = {
    total: services?.length || 0,
    healthy: services?.filter((s) => s.status === "healthy").length || 0,
    degraded: services?.filter((s) => s.status === "degraded").length || 0,
    down: services?.filter((s) => s.status === "down").length || 0,
    unknown: services?.filter((s) => s.status === "unknown").length || 0,
  };

  return {
    ...rest,
    data: services,
    summary,
  };
}

export function useMonthlyServiceCosts(targetDate: Date = new Date()) {
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth() + 1;

  return useQuery({
    queryKey: ["monthly-service-costs", targetYear, targetMonth],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_monthly_service_costs", {
        p_year: targetYear,
        p_month: targetMonth,
      });

      if (error) throw error;
      return (data || []) as MonthlyServiceCost[];
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
