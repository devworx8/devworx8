import { serve } from 'https://deno.land/std@0.214.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') || '';
const USD_TO_ZAR_RATE = Number.parseFloat(
  Deno.env.get('USD_TO_ZAR_RATE') || Deno.env.get('EXPO_PUBLIC_USD_TO_ZAR_RATE') || '18',
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

type AiUsageRow = {
  preschool_id: string | null;
  organization_id: string | null;
  service_type: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_cost: number | null;
  status: string | null;
};

type DeliveryRow = {
  recipient_id: string | null;
  channel: string | null;
  status: string | null;
  actual_cost: number | null;
  estimated_cost: number | null;
  cost_currency: string | null;
};

type ProfileRow = {
  id: string;
  preschool_id: string | null;
  organization_id: string | null;
};

type CostRow = {
  preschool_id: string;
  service_name: string;
  period_month: string;
  cost_usd: number;
  cost_zar: number;
  usage_units: Record<string, unknown>;
  updated_at: string;
};

type AggregateSummary = {
  rows_scanned: number;
  rows_skipped: number;
  rows_aggregated: number;
  total_cost_usd: number;
  total_cost_zar: number;
};

function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim() || null;
}

function isServiceRoleJwt(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return false;
    const payload = JSON.parse(atob(parts[1]));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

function normalizeServiceType(serviceType: string | null): string {
  if (!serviceType) return 'unknown';
  return serviceType
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'unknown';
}

function parseTargetMonth(targetMonthRaw: unknown): Date {
  const parsed = typeof targetMonthRaw === 'string' ? new Date(targetMonthRaw) : new Date();
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}

function getMonthWindow(targetMonth: Date): { monthStart: Date; monthEnd: Date; monthIso: string } {
  const monthStart = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 1));
  const monthIso = monthStart.toISOString().slice(0, 10);
  return { monthStart, monthEnd, monthIso };
}

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

async function fetchAllAiRows(
  supabase: ReturnType<typeof createClient>,
  monthStartIso: string,
  monthEndIso: string,
): Promise<AiUsageRow[]> {
  const pageSize = 1000;
  let from = 0;
  const rows: AiUsageRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('ai_usage_logs')
      .select('preschool_id, organization_id, service_type, input_tokens, output_tokens, total_cost, status')
      .gte('created_at', monthStartIso)
      .lt('created_at', monthEndIso)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const page = (data || []) as AiUsageRow[];
    rows.push(...page);

    if (page.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function fetchAllDeliveryRows(
  supabase: ReturnType<typeof createClient>,
  monthStartIso: string,
  monthEndIso: string,
): Promise<DeliveryRow[]> {
  const pageSize = 1000;
  let from = 0;
  const rows: DeliveryRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('notification_deliveries')
      .select('recipient_id, channel, status, actual_cost, estimated_cost, cost_currency')
      .gte('created_at', monthStartIso)
      .lt('created_at', monthEndIso)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const page = (data || []) as DeliveryRow[];
    rows.push(...page);

    if (page.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function fetchProfilesByIds(
  supabase: ReturnType<typeof createClient>,
  profileIds: string[],
): Promise<Map<string, ProfileRow>> {
  const profileMap = new Map<string, ProfileRow>();
  if (profileIds.length === 0) return profileMap;

  for (const idChunk of chunkArray(profileIds, 500)) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, preschool_id, organization_id')
      .in('id', idChunk);

    if (error) throw error;
    for (const profile of (data || []) as ProfileRow[]) {
      profileMap.set(profile.id, profile);
    }
  }

  return profileMap;
}

async function upsertCostRows(
  supabase: ReturnType<typeof createClient>,
  rows: CostRow[],
): Promise<void> {
  if (rows.length === 0) return;
  for (const chunk of chunkArray(rows, 500)) {
    const { error } = await supabase
      .from('service_cost_tracking')
      .upsert(chunk, { onConflict: 'preschool_id,service_name,period_month' });
    if (error) throw error;
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing Supabase environment configuration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const token = getToken(req);
    const isCronToken = token !== null && CRON_SECRET !== '' && token === CRON_SECRET;
    const isServiceRoleToken = token !== null && token === SUPABASE_SERVICE_ROLE_KEY;
    const isSignedServiceRole = token !== null && isServiceRoleJwt(token);
    if (!isCronToken && !isServiceRoleToken && !isSignedServiceRole) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean((body as { dry_run?: boolean })?.dry_run);
    const targetMonth = parseTargetMonth((body as { target_month?: string }).target_month);
    const { monthStart, monthEnd, monthIso } = getMonthWindow(targetMonth);
    const monthStartIso = monthStart.toISOString();
    const monthEndIso = monthEnd.toISOString();
    const nowIso = new Date().toISOString();

    const fxRate = Number.isFinite(USD_TO_ZAR_RATE) && USD_TO_ZAR_RATE > 0 ? USD_TO_ZAR_RATE : 18;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: activeSchools, error: schoolError } = await supabase
      .from('preschools')
      .select('id')
      .eq('is_active', true);
    if (schoolError) throw schoolError;
    const schoolIdSet = new Set((activeSchools || []).map((school: { id: string }) => school.id));

    const aiRows = await fetchAllAiRows(supabase, monthStartIso, monthEndIso);
    const aiAgg = new Map<string, {
      preschoolId: string;
      serviceName: string;
      requests: number;
      successfulRequests: number;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
    }>();
    let aiSkipped = 0;

    for (const row of aiRows) {
      const candidateSchoolId = row.preschool_id || row.organization_id;
      if (!candidateSchoolId || !schoolIdSet.has(candidateSchoolId)) {
        aiSkipped++;
        continue;
      }
      const serviceName = `ai:${normalizeServiceType(row.service_type)}`;
      const key = `${candidateSchoolId}|${serviceName}`;
      if (!aiAgg.has(key)) {
        aiAgg.set(key, {
          preschoolId: candidateSchoolId,
          serviceName,
          requests: 0,
          successfulRequests: 0,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
        });
      }
      const entry = aiAgg.get(key)!;
      entry.requests += 1;
      if (String(row.status || '').toLowerCase() === 'success') {
        entry.successfulRequests += 1;
      }
      entry.inputTokens += Number(row.input_tokens || 0);
      entry.outputTokens += Number(row.output_tokens || 0);
      entry.costUsd += Number(row.total_cost || 0);
    }

    const aiCostRows: CostRow[] = Array.from(aiAgg.values()).map((entry) => ({
      preschool_id: entry.preschoolId,
      service_name: entry.serviceName,
      period_month: monthIso,
      cost_usd: roundTo(entry.costUsd, 4),
      cost_zar: roundTo(entry.costUsd * fxRate, 2),
      usage_units: {
        requests: entry.requests,
        successful_requests: entry.successfulRequests,
        failed_requests: Math.max(0, entry.requests - entry.successfulRequests),
        input_tokens: entry.inputTokens,
        output_tokens: entry.outputTokens,
        total_tokens: entry.inputTokens + entry.outputTokens,
      },
      updated_at: nowIso,
    }));

    const deliveryRows = await fetchAllDeliveryRows(supabase, monthStartIso, monthEndIso);
    const recipientIds = Array.from(
      new Set(deliveryRows.map((row) => row.recipient_id).filter((id): id is string => Boolean(id))),
    );
    const profileMap = await fetchProfilesByIds(supabase, recipientIds);

    const successfulDeliveryStates = new Set(['sent', 'delivered', 'opened', 'clicked']);
    const deliveryAgg = new Map<string, {
      preschoolId: string;
      serviceName: string;
      deliveries: number;
      successfulDeliveries: number;
      costUsd: number;
      costZar: number;
    }>();
    let deliverySkipped = 0;

    for (const row of deliveryRows) {
      const recipientId = row.recipient_id;
      if (!recipientId) {
        deliverySkipped++;
        continue;
      }
      const profile = profileMap.get(recipientId);
      const candidateSchoolId = profile?.preschool_id || profile?.organization_id || null;
      if (!candidateSchoolId || !schoolIdSet.has(candidateSchoolId)) {
        deliverySkipped++;
        continue;
      }

      const rawAmount = Number(row.actual_cost ?? row.estimated_cost ?? 0);
      const normalizedAmount = Number.isFinite(rawAmount) ? rawAmount : 0;
      const currency = String(row.cost_currency || 'USD').toUpperCase();
      const costUsd = currency === 'ZAR' ? normalizedAmount / fxRate : normalizedAmount;
      const costZar = currency === 'ZAR' ? normalizedAmount : normalizedAmount * fxRate;

      const channel = normalizeServiceType(row.channel || 'unknown');
      const serviceName = `notifications:${channel}`;
      const key = `${candidateSchoolId}|${serviceName}`;
      if (!deliveryAgg.has(key)) {
        deliveryAgg.set(key, {
          preschoolId: candidateSchoolId,
          serviceName,
          deliveries: 0,
          successfulDeliveries: 0,
          costUsd: 0,
          costZar: 0,
        });
      }
      const entry = deliveryAgg.get(key)!;
      entry.deliveries += 1;
      if (successfulDeliveryStates.has(String(row.status || '').toLowerCase())) {
        entry.successfulDeliveries += 1;
      }
      entry.costUsd += costUsd;
      entry.costZar += costZar;
    }

    const deliveryCostRows: CostRow[] = Array.from(deliveryAgg.values()).map((entry) => ({
      preschool_id: entry.preschoolId,
      service_name: entry.serviceName,
      period_month: monthIso,
      cost_usd: roundTo(entry.costUsd, 4),
      cost_zar: roundTo(entry.costZar, 2),
      usage_units: {
        deliveries: entry.deliveries,
        successful_deliveries: entry.successfulDeliveries,
        failed_deliveries: Math.max(0, entry.deliveries - entry.successfulDeliveries),
      },
      updated_at: nowIso,
    }));

    if (!dryRun) {
      const { error: clearAiError } = await supabase
        .from('service_cost_tracking')
        .delete()
        .eq('period_month', monthIso)
        .like('service_name', 'ai:%');
      if (clearAiError) throw clearAiError;

      const { error: clearDeliveryError } = await supabase
        .from('service_cost_tracking')
        .delete()
        .eq('period_month', monthIso)
        .like('service_name', 'notifications:%');
      if (clearDeliveryError) throw clearDeliveryError;

      await upsertCostRows(supabase, [...aiCostRows, ...deliveryCostRows]);
    }

    const aiSummary: AggregateSummary = {
      rows_scanned: aiRows.length,
      rows_skipped: aiSkipped,
      rows_aggregated: aiCostRows.length,
      total_cost_usd: roundTo(aiCostRows.reduce((sum, row) => sum + row.cost_usd, 0), 4),
      total_cost_zar: roundTo(aiCostRows.reduce((sum, row) => sum + row.cost_zar, 0), 2),
    };
    const deliverySummary: AggregateSummary = {
      rows_scanned: deliveryRows.length,
      rows_skipped: deliverySkipped,
      rows_aggregated: deliveryCostRows.length,
      total_cost_usd: roundTo(deliveryCostRows.reduce((sum, row) => sum + row.cost_usd, 0), 4),
      total_cost_zar: roundTo(deliveryCostRows.reduce((sum, row) => sum + row.cost_zar, 0), 2),
    };

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        target_month: monthIso,
        usd_to_zar_rate: fxRate,
        rows_upserted: dryRun ? 0 : aiCostRows.length + deliveryCostRows.length,
        ai: aiSummary,
        notifications: deliverySummary,
        completed_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
