import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { assertSupabase } from '@/lib/supabase';
import type {
  SOAMessage,
  SOAMessageReaction,
  SOAThreadDetail,
  SOAThreadListItem,
  SOAThreadStats,
  SOAThreadType,
  SOAWing,
} from '@/components/soa-messaging/types';

type ThreadFilterParams = {
  organizationId?: string;
  threadType?: SOAThreadType;
  search?: string;
  enabled?: boolean;
};

type MessagesParams = {
  threadId: string | null;
  enabled?: boolean;
};

type CreateThreadInput = {
  organization_id: string;
  region_id?: string | null;
  wing?: SOAWing;
  thread_type: SOAThreadType;
  subject?: string;
  description?: string;
};

const EMPTY_STATS: SOAThreadStats = { totalThreads: 0, totalUnread: 0 };

function normalizeRole(role: string | null | undefined): string {
  const r = (role || '').toLowerCase();
  if (r.includes('teacher')) return 'teacher';
  if (r.includes('principal') || r.includes('admin')) return 'admin';
  return 'parent';
}

function mapDbTypeToSOAThreadType(
  dbType: string | null | undefined,
  subject: string | null | undefined,
): SOAThreadType {
  const meta = parseSubjectMetadata(subject).threadType;
  if (meta) return meta;
  const t = (dbType || '').toLowerCase();
  if (t === 'announcement') return 'broadcast';
  if (t === 'class_group' || t === 'teacher_group' || t === 'parent_group') return 'wing_chat';
  if (t === 'custom') return 'regional_chat';
  return 'direct';
}

function mapSOAThreadTypeToDb(type: SOAThreadType): string {
  if (type === 'broadcast') return 'announcement';
  if (type === 'wing_chat') return 'class_group';
  if (type === 'regional_chat') return 'custom';
  return 'general';
}

function parseSubjectMetadata(subject: string | null | undefined): {
  cleanSubject: string | null;
  threadType: SOAThreadType | null;
  wing: SOAWing | null;
} {
  if (!subject) return { cleanSubject: null, threadType: null, wing: null };
  const trimmed = subject.trim();
  const match = trimmed.match(/^\[(broadcast|regional_chat|wing_chat|direct)(?::(youth|women|men|seniors))?\]\s*/i);
  if (!match) return { cleanSubject: subject, threadType: null, wing: null };

  const threadType = (match[1] || '').toLowerCase() as SOAThreadType;
  const wing = (match[2] || '').toLowerCase() as SOAWing;
  return {
    cleanSubject: trimmed.replace(match[0], '').trim() || null,
    threadType,
    wing: wing || null,
  };
}

function encodeSubjectMetadata(baseSubject: string, threadType: SOAThreadType, wing?: SOAWing): string {
  const prefix = wing ? `[${threadType}:${wing}]` : `[${threadType}]`;
  return `${prefix} ${baseSubject}`.trim();
}

function mapThreadRow(
  row: any,
  summary: any,
  isMuted: boolean,
): SOAThreadListItem {
  const parsed = parseSubjectMetadata(row?.subject || null);
  return {
    id: row.id,
    subject: parsed.cleanSubject ?? row.subject ?? null,
    thread_type: mapDbTypeToSOAThreadType(row?.type, row?.subject),
    wing: parsed.wing,
    region: null,
    last_message_at:
      row?.last_message_at ||
      row?.updated_at ||
      row?.created_at ||
      new Date().toISOString(),
    last_message_preview: summary?.last_message_content || null,
    unread_count: Number(summary?.unread_count || 0),
    is_muted: !!isMuted,
    is_pinned: false,
  };
}

function defaultSubjectForType(type: SOAThreadType): string {
  if (type === 'broadcast') return 'Announcement';
  if (type === 'regional_chat') return 'Regional Chat';
  if (type === 'wing_chat') return 'Wing Chat';
  return 'Direct Message';
}

export function useSOAThreads(params: ThreadFilterParams) {
  const { user } = useAuth();
  const enabled = (params.enabled ?? true) && !!user?.id;

  const query = useQuery({
    queryKey: [
      'soa',
      'threads',
      user?.id,
      params.organizationId || null,
      params.threadType || null,
      params.search || null,
    ],
    queryFn: async (): Promise<{ threads: SOAThreadListItem[]; stats: SOAThreadStats }> => {
      if (!user?.id) return { threads: [], stats: EMPTY_STATS };

      const supabase = assertSupabase();

      const { data: participations, error: participantError } = await supabase
        .from('message_participants')
        .select('thread_id, is_muted')
        .eq('user_id', user.id);

      if (participantError || !participations?.length) {
        return { threads: [], stats: EMPTY_STATS };
      }

      const threadIds = participations.map((p: any) => p.thread_id);
      const mutedByThreadId = new Map<string, boolean>(
        participations.map((p: any) => [p.thread_id, !!p.is_muted]),
      );

      const { data: threads, error: threadError } = await supabase
        .from('message_threads')
        .select('id, subject, type, last_message_at, created_at, updated_at')
        .in('id', threadIds)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (threadError || !threads?.length) {
        return { threads: [], stats: EMPTY_STATS };
      }

      const { data: summaryRows } = await supabase.rpc('get_my_message_threads_summary');
      const summaryByThreadId = new Map<string, any>();
      (summaryRows || []).forEach((row: any) => {
        if (row?.thread_id) summaryByThreadId.set(row.thread_id, row);
      });

      let mapped = threads.map((row: any) =>
        mapThreadRow(row, summaryByThreadId.get(row.id), mutedByThreadId.get(row.id) || false),
      );

      if (params.threadType) {
        mapped = mapped.filter((thread) => thread.thread_type === params.threadType);
      }

      if (params.search?.trim()) {
        const q = params.search.trim().toLowerCase();
        mapped = mapped.filter((thread) => {
          const subject = (thread.subject || '').toLowerCase();
          const preview = (thread.last_message_preview || '').toLowerCase();
          return subject.includes(q) || preview.includes(q);
        });
      }

      const stats: SOAThreadStats = {
        totalThreads: mapped.length,
        totalUnread: mapped.reduce((sum, t) => sum + t.unread_count, 0),
      };

      return { threads: mapped, stats };
    },
    enabled,
    staleTime: 15_000,
  });

  return {
    threads: query.data?.threads || [],
    stats: query.data?.stats || EMPTY_STATS,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useSOAThread(threadId: string | null) {
  const { user } = useAuth();
  const enabled = !!threadId && !!user?.id;

  const query = useQuery({
    queryKey: ['soa', 'thread', threadId, user?.id],
    queryFn: async (): Promise<SOAThreadDetail | null> => {
      if (!threadId || !user?.id) return null;
      const supabase = assertSupabase();

      const { data: row, error } = await supabase
        .from('message_threads')
        .select('id, subject, type, last_message_at, created_at, updated_at, created_by')
        .eq('id', threadId)
        .single();

      if (error || !row) return null;

      const mapped = mapThreadRow(row, null, false);
      return {
        ...mapped,
        created_by: row.created_by,
      };
    },
    enabled,
    staleTime: 15_000,
  });

  return {
    thread: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useSOAMessages(params: MessagesParams) {
  const { user } = useAuth();
  const enabled = (params.enabled ?? true) && !!params.threadId && !!user?.id;

  const query = useQuery({
    queryKey: ['soa', 'messages', params.threadId, user?.id],
    queryFn: async (): Promise<SOAMessage[]> => {
      if (!params.threadId || !user?.id) return [];
      const supabase = assertSupabase();

      // Best effort for delivery receipts. We keep this non-blocking.
      supabase.rpc('mark_messages_delivered', {
        p_thread_id: params.threadId,
        p_user_id: user.id,
      }).then(() => {}, () => {});

      const { data: rows, error } = await supabase
        .from('messages')
        .select('id, thread_id, sender_id, content, content_type, created_at, voice_url, voice_duration, read_by, deleted_at')
        .eq('thread_id', params.threadId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error || !rows?.length) return [];

      const senderIds = Array.from(new Set(rows.map((m: any) => m.sender_id)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('id', senderIds);
      const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

      const messageIds = rows.map((m: any) => m.id);
      const { data: reactions } = await supabase
        .from('message_reactions')
        .select('message_id, emoji, user_id, created_at')
        .in('message_id', messageIds);

      const reactionsByMessageId = new Map<string, SOAMessageReaction[]>();
      (reactions || []).forEach((r: any) => {
        const prev = reactionsByMessageId.get(r.message_id) || [];
        prev.push({
          emoji: r.emoji,
          user_id: r.user_id,
          created_at: r.created_at || null,
        });
        reactionsByMessageId.set(r.message_id, prev);
      });

      return rows.map((row: any) => {
        const sender = profileById.get(row.sender_id);
        const readBy = Array.isArray(row.read_by) ? row.read_by : [];
        return {
          id: row.id,
          thread_id: row.thread_id,
          sender_id: row.sender_id,
          content: row.content,
          content_type: row.content_type || 'text',
          created_at: row.created_at || new Date().toISOString(),
          attachment_url: row.voice_url || null,
          voice_duration: row.voice_duration ?? null,
          is_read: readBy.includes(user.id),
          sender: sender
            ? {
                first_name: sender.first_name,
                last_name: sender.last_name,
                member_type: sender.role || 'member',
              }
            : undefined,
          reactions: reactionsByMessageId.get(row.id) || [],
        } as SOAMessage;
      });
    },
    enabled,
    staleTime: 5_000,
  });

  return {
    messages: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useSOASendMessage(threadId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: async ({
      content,
      contentType,
      voiceUrl,
      voiceDuration,
    }: {
      content: string;
      contentType: 'text' | 'voice';
      voiceUrl?: string;
      voiceDuration?: number;
    }) => {
      if (!threadId || !user?.id) throw new Error('Thread not available');
      const supabase = assertSupabase();

      const { data, error } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          content: content.trim(),
          content_type: contentType,
          voice_url: voiceUrl || null,
          voice_duration: voiceDuration || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      await supabase
        .from('message_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', threadId);

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['soa', 'messages', threadId, user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['soa', 'threads'] });
    },
  });

  return {
    sendMessage: async (content: string) =>
      sendMutation.mutateAsync({ content, contentType: 'text' }),
    sendVoiceMessage: async (uri: string, duration: number) =>
      sendMutation.mutateAsync({
        content: '[Voice message]',
        contentType: 'voice',
        voiceUrl: uri,
        voiceDuration: duration,
      }),
    sending: sendMutation.isPending,
    error: sendMutation.error,
  };
}

export function useSOAReactions(threadId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user?.id) throw new Error('Authentication required');
      const supabase = assertSupabase();
      const { error } = await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, emoji, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['soa', 'messages', threadId, user?.id] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user?.id) throw new Error('Authentication required');
      const supabase = assertSupabase();
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('emoji', emoji)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['soa', 'messages', threadId, user?.id] });
    },
  });

  return {
    addReaction: async (messageId: string, emoji: string) =>
      addMutation.mutateAsync({ messageId, emoji }),
    removeReaction: async (messageId: string, emoji: string) =>
      removeMutation.mutateAsync({ messageId, emoji }),
  };
}

export function useSOACreateThread() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: CreateThreadInput): Promise<SOAThreadDetail> => {
      if (!user?.id) throw new Error('Authentication required');
      const supabase = assertSupabase();
      const profileAny = (profile || {}) as any;

      const preschoolId =
        profileAny.preschool_id ||
        profileAny.organization_id ||
        input.organization_id;
      if (!preschoolId) {
        throw new Error('Organization context missing');
      }

      const baseSubject = (input.subject || defaultSubjectForType(input.thread_type)).trim();
      const encodedSubject = encodeSubjectMetadata(baseSubject, input.thread_type, input.wing);

      const { data: threadRow, error: threadError } = await supabase
        .from('message_threads')
        .insert({
          preschool_id: preschoolId,
          type: mapSOAThreadTypeToDb(input.thread_type),
          subject: encodedSubject,
          created_by: user.id,
          last_message_at: new Date().toISOString(),
        })
        .select('id, subject, type, last_message_at, created_at, updated_at, created_by')
        .single();

      if (threadError || !threadRow) {
        throw threadError || new Error('Failed to create thread');
      }

      const role = normalizeRole(profileAny.role);
      await supabase.from('message_participants').insert({
        thread_id: threadRow.id,
        user_id: user.id,
        role,
      });

      const mapped = mapThreadRow(threadRow, null, false);
      return {
        ...mapped,
        created_by: threadRow.created_by,
      };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['soa', 'threads'] });
    },
  });

  return {
    createThread: mutation.mutateAsync,
    creating: mutation.isPending,
    error: mutation.error,
  };
}
