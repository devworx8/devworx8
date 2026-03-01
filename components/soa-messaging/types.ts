/**
 * SOA Messaging type stubs.
 * The full SOA web portal was removed; these types remain so the
 * membership screens compile without breaking.
 */

export type SOAWing =
  | 'youth'
  | 'women'
  | 'men'
  | 'elders'
  | 'seniors'
  | 'veterans'
  | 'general';

export type SOAThreadType =
  | 'broadcast'
  | 'regional_chat'
  | 'wing_chat'
  | 'direct';

export interface SOAMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
  reactions?: any;
  attachments?: any[];
  is_read?: boolean;
  [key: string]: any;
}

export interface SOAThreadListItem {
  id: string;
  type: SOAThreadType;
  title: string;
  subject?: string;
  thread_type?: SOAThreadType;
  last_message?: string;
  last_message_preview?: string;
  last_message_at?: string;
  unread_count: number;
  participant_count: number;
  wing?: SOAWing;
  region?: any;
  is_pinned?: boolean;
  is_muted?: boolean;
  organization_id?: string;
}

export const WING_CONFIG: Record<SOAWing, { label: string; color: string; icon: string }> = {
  youth: { label: 'Youth Wing', color: '#3B82F6', icon: 'people' },
  women: { label: "Women's Wing", color: '#EC4899', icon: 'people' },
  men: { label: "Men's Wing", color: '#2563EB', icon: 'people' },
  elders: { label: 'Elders Council', color: '#F59E0B', icon: 'people' },
  seniors: { label: 'Seniors', color: '#D97706', icon: 'people' },
  veterans: { label: 'Veterans', color: '#10B981', icon: 'people' },
  general: { label: 'General', color: '#6B7280', icon: 'people' },
};

export const THREAD_TYPE_CONFIG: Record<SOAThreadType, { label: string; icon: string }> = {
  broadcast: { label: 'Broadcast', icon: 'megaphone' },
  regional_chat: { label: 'Regional Chat', icon: 'location' },
  wing_chat: { label: 'Wing Chat', icon: 'people' },
  direct: { label: 'Direct Message', icon: 'chatbubble' },
};
