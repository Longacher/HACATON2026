export interface QueueItem {
  id: string;
  track_number: string;
  status: string;
  priority: string;
  is_crisis: boolean;
  created_at: string;
  category_id: string | null;
  applicant_type: string;
  excerpt: string;
  return_reason?: string | null;
  idle_hours?: number;
  has_complaint?: boolean;
  complaint_seen?: boolean;
  wait_hours?: number;
  is_overdue?: boolean;
}

export interface AppealFull {
  id: string;
  track_number: string;
  category_id: string | null;
  created_at: string;
  text?: string | null;
  answers?: Record<string, unknown>;
  messages?: { author_type: string; text: string; created_at: string }[];
  notes?: { id: string; text: string }[];
  hint?: unknown;
  expert?: { id: string } | null;
  transfers?: { reason: string | null; resolved: boolean }[];
  complaint?: { text: string | null; seen: boolean } | null;
  contact?: { name: string | null; value: string | null } | null;
  attachments?: { filename: string; size_bytes: number; url?: string }[];
  priority: string;
  status: string;
  is_crisis: boolean;
  applicant_type: string;
  return_reason?: string | null;
}

export interface ExpertAppeal {
  id: string;
  status: string;
  priority: string;
  is_crisis: boolean;
  created_at: string;
  applicant_type: string;
  text: string | null;
  is_responsible: boolean;
}