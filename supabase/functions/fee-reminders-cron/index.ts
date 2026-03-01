/**
 * Fee Reminders Cron Job
 *
 * Sends school fee reminders to parents/guardians:
 * - 3 days before due date
 * - on due date
 *
 * Every reminder includes a POP upload prompt for parents who already paid.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET') || 'your-cron-secret';

interface FeeRow {
  id: string;
  student_id: string;
  due_date: string;
  amount: number | null;
  final_amount: number | null;
  status: string;
  student?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    parent_id?: string | null;
    guardian_id?: string | null;
    preschool_id?: string | null;
  } | null;
}

interface ReminderDispatchGroup {
  preschoolId: string | null;
  schoolName: string;
  dueDate: string;
  daysUntil: number;
  reminderKind: 'due_soon' | 'due_today';
  recipients: Set<string>;
  childNames: Set<string>;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;
    const isCronJob = token === CRON_SECRET;

    let isValidServiceRole = false;
    if (token && !isServiceRole && !isCronJob) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        isValidServiceRole = payload.role === 'service_role';
      } catch {
        // ignore
      }
    }

    if (!isCronJob && !isServiceRole && !isValidServiceRole) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueSoonDate = new Date(today);
    dueSoonDate.setDate(dueSoonDate.getDate() + 3);
    const dueSoonDateStr = dueSoonDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const reminderByDate = new Map<string, { days_until: number; reminder_kind: 'due_soon' | 'due_today' }>([
      [dueSoonDateStr, { days_until: 3, reminder_kind: 'due_soon' }],
      [todayStr, { days_until: 0, reminder_kind: 'due_today' }],
    ]);
    const reminderDates = Array.from(reminderByDate.keys());

    const { data: fees, error } = await supabase
      .from('student_fees')
      .select(
        `
        id,
        student_id,
        due_date,
        amount,
        final_amount,
        status,
        student:students!student_fees_student_id_fkey(
          id,
          first_name,
          last_name,
          parent_id,
          guardian_id,
          preschool_id
        )
      `
      )
      .in('status', ['pending', 'overdue', 'partially_paid'])
      .in('due_date', reminderDates);

    if (error) throw error;

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      due_soon_sent: 0,
      due_today_sent: 0,
      dispatches: 0,
    };

    const schoolNameCache = new Map<string, string>();
    const dispatchGroups = new Map<string, ReminderDispatchGroup>();

    for (const fee of (fees || []) as FeeRow[]) {
      results.processed++;
      const student = fee.student;
      if (!student) continue;

      const recipients = [student.parent_id, student.guardian_id].filter(Boolean) as string[];
      if (recipients.length === 0) continue;

      const preschoolId = student.preschool_id || null;
      let schoolName = 'your school';
      if (preschoolId) {
        if (schoolNameCache.has(preschoolId)) {
          schoolName = schoolNameCache.get(preschoolId) || schoolName;
        } else {
          const { data: school } = await supabase
            .from('preschools')
            .select('name')
            .eq('id', preschoolId)
            .maybeSingle();
          if (school?.name) {
            schoolName = school.name;
            schoolNameCache.set(preschoolId, school.name);
          }
        }
      }

      const amount = fee.final_amount ?? fee.amount ?? 0;
      const childName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'your child';
      const reminderMeta = reminderByDate.get(fee.due_date) ?? { days_until: 3, reminder_kind: 'due_soon' as const };
      void amount; // amount varies per learner; grouped reminders omit per-learner amounts.

      const groupKey = `${preschoolId || 'none'}|${fee.due_date}|${reminderMeta.reminder_kind}`;
      if (!dispatchGroups.has(groupKey)) {
        dispatchGroups.set(groupKey, {
          preschoolId,
          schoolName,
          dueDate: fee.due_date,
          daysUntil: reminderMeta.days_until,
          reminderKind: reminderMeta.reminder_kind,
          recipients: new Set<string>(),
          childNames: new Set<string>(),
        });
      }

      const group = dispatchGroups.get(groupKey)!;
      for (const recipientId of recipients) {
        group.recipients.add(recipientId);
      }
      if (childName) {
        group.childNames.add(childName);
      }
    }

    for (const group of dispatchGroups.values()) {
      const userIds = Array.from(group.recipients);
      if (!userIds.length) continue;

      const childNameForMessage = group.childNames.size === 1
        ? Array.from(group.childNames)[0]
        : undefined;

      try {
        await supabase.functions.invoke('notifications-dispatcher', {
          body: {
            event_type: 'fee_due_soon',
            user_ids: userIds,
            preschool_id: group.preschoolId,
            include_email: true,
            include_push: true,
            custom_payload: {
              child_name: childNameForMessage,
              due_date: group.dueDate,
              days_until: group.daysUntil,
              reminder_kind: group.reminderKind,
              pop_upload_prompt: 'If you already paid, please upload your POP in the app.',
              school_name: group.schoolName,
            },
          },
        });

        results.dispatches++;
        results.sent += userIds.length;
        if (group.reminderKind === 'due_today') {
          results.due_today_sent += userIds.length;
        } else {
          results.due_soon_sent += userIds.length;
        }
      } catch (err) {
        console.error('[fee-reminders-cron] Failed to dispatch reminder group:', err);
        results.failed += userIds.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        target_dates: reminderDates,
        results,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[fee-reminders-cron] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
