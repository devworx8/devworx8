/**
 * SOA Messaging hooks stubs.
 * The full SOA web portal was removed; these hooks return empty/no-op
 * values so the membership screens compile and render safely.
 */

import { useCallback } from 'react';
import type { SOAMessage, SOAThreadListItem } from '@/components/soa-messaging/types';

export function useSOAThreads(_filter?: any) {
  return {
    threads: [] as SOAThreadListItem[],
    data: [] as SOAThreadListItem[],
    isLoading: false,
    error: null,
    refetch: async () => {},
    stats: { total: 0, unread: 0, totalThreads: 0, totalUnread: 0 },
  };
}

export function useSOAThread(_threadId: any) {
  return {
    data: null as SOAThreadListItem | null,
    thread: null as SOAThreadListItem | null,
    isLoading: false,
    error: null,
  };
}

export function useSOAMessages(_threadId: any, ..._args: any[]) {
  return {
    data: [] as SOAMessage[],
    messages: [] as SOAMessage[],
    isLoading: false,
    error: null,
    refetch: async () => {},
    hasNextPage: false,
    fetchNextPage: async () => {},
  };
}

export function useSOASendMessage(_threadId?: string) {
  const noop = useCallback(async (..._args: any[]) => {}, []);
  return {
    mutate: noop,
    mutateAsync: noop,
    sendMessage: noop,
    sendVoiceMessage: noop,
    sending: false,
    isPending: false,
  };
}

export function useSOAReactions(_threadId?: any) {
  const noop = useCallback(async (..._args: any[]) => {}, []);
  return {
    toggleReaction: noop,
    addReaction: noop,
    removeReaction: noop,
    isPending: false,
  };
}

export function useSOACreateThread() {
  const createThread = useCallback(async (_params: Record<string, unknown>) => {
    return { id: '', subject: '', wing: '', thread_type: '' };
  }, []);
  return {
    mutate: createThread,
    mutateAsync: createThread,
    createThread,
    creating: false,
    isPending: false,
    error: null as Error | null,
  };
}
