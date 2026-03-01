export type SOAWing = 'youth' | 'women' | 'men' | 'seniors';

export type SOAThreadType = 'broadcast' | 'regional_chat' | 'wing_chat' | 'direct';

export interface SOARegionRef {
  id: string;
  name: string;
}

export interface SOAThreadListItem {
  id: string;
  subject: string | null;
  thread_type: SOAThreadType;
  wing: SOAWing | null;
  region: SOARegionRef | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  is_muted: boolean;
  is_pinned: boolean;
}

export interface SOAThreadDetail extends SOAThreadListItem {
  created_by?: string;
  description?: string | null;
}

export interface SOAMessageReaction {
  emoji: string;
  user_id: string;
  created_at?: string | null;
}

export interface SOAMessageSender {
  first_name?: string;
  last_name?: string;
  member_type?: string;
}

export interface SOAMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  content_type: string;
  created_at: string;
  attachment_url: string | null;
  voice_duration: number | null;
  is_read: boolean;
  sender?: SOAMessageSender;
  reactions?: SOAMessageReaction[];
}

export interface SOAThreadStats {
  totalThreads: number;
  totalUnread: number;
}

export const WING_CONFIG: Record<
  SOAWing,
  { label: string; color: string; icon: string }
> = {
  youth: { label: 'Youth Wing', color: '#3B82F6', icon: 'school-outline' },
  women: { label: "Women's Wing", color: '#EC4899', icon: 'female-outline' },
  men: { label: "Men's Wing", color: '#10B981', icon: 'male-outline' },
  seniors: { label: 'Seniors Wing', color: '#F59E0B', icon: 'people-outline' },
};

export const THREAD_TYPE_CONFIG: Record<
  SOAThreadType,
  { label: string; icon: string; color: string }
> = {
  broadcast: { label: 'Announcements', icon: 'megaphone-outline', color: '#F59E0B' },
  regional_chat: { label: 'Regional Chat', icon: 'location-outline', color: '#8B5CF6' },
  wing_chat: { label: 'Wing Chat', icon: 'people-outline', color: '#10B981' },
  direct: { label: 'Direct Message', icon: 'chatbubble-outline', color: '#3B82F6' },
};
