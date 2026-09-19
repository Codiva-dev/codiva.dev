export type StaffOption = { id: string; full_name: string; role: string };

export type ProjectStaffRow = {
  staff_id: string;
  role_on_project: string;
  staff_profiles: { full_name: string; role: string } | { full_name: string; role: string }[] | null;
};

export type ProjectDetail = {
  id: string;
  name: string;
  slug: string;
  status: string;
  progress_percent: number | null;
  start_date: string | null;
  target_delivery_date: string | null;
  document_retention_days: number | null;
  description: string | null;
  client_visible: boolean;
  portal_show_quote: boolean | null;
  portal_show_costs: boolean | null;
  site_preview_url: string | null;
  site_production_url: string | null;
  organization_id: string | null;
};

export type QuoteRow = {
  id: string;
  title: string;
  version: number;
  status: string;
  scope: string | null;
  total_amount: number | null;
  currency: string;
  hourly_rate: number | null;
  visible_to_client: boolean | null;
};

export type ChargeRow = {
  id: string;
  title: string;
  kind: string;
  status: string;
  amount: number | null;
  currency: string;
  period_label: string | null;
  due_date: string | null;
  notice_days: number | null;
  description: string | null;
  staff_notes: string | null;
  visible_to_client: boolean | null;
  paid_at: string | null;
};

export type MilestoneRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  visible_to_client: boolean;
  milestone_updates?: { id: string; body: string; created_at: string }[];
};

export type DocumentRow = {
  id: string;
  title: string;
  type: string;
  source: string | null;
  signed: boolean;
  disposed_at: string | null;
  uploaded_at: string;
  scan_status: string | null;
  retain_until: string | null;
  content_sha256: string | null;
  notes: string | null;
  file_path: string | null;
  file_url: string | null;
};

export type DocumentRequestRow = {
  id: string;
  title: string;
  code: string | null;
  status: string;
  input_mode: string;
  required: boolean;
  description: string | null;
  response_text: string | null;
};

export type DeliverableRow = {
  id: string;
  title: string;
  kind: string | null;
  visible_to_client: boolean;
  url: string | null;
  file_path: string | null;
  file_url: string | null;
};

export type FileAccessRow = {
  id: string;
  file_path: string;
  actor_id: string | null;
  created_at: string;
  ip: string | null;
};

export type ActivityRow = {
  id: string;
  action: string;
  actor_id: string | null;
  created_at: string;
};

export type MemberRow = {
  id: string;
  role: string;
  invited_at: string;
  user_id: string;
  terms_accepted_at: string | null;
  terms_version: string | null;
  privacy_accepted_at: string | null;
  privacy_version: string | null;
  nda_accepted_at: string | null;
  nda_version: string | null;
};

export type TicketRow = {
  id: string;
  title: string;
};

export type SiblingProject = { id: string; name: string };

export type SiteAccessRow = {
  id: string;
  label: string;
  kind: string;
  url: string | null;
  username: string | null;
  secret: string | null;
  notes: string;
  visible_to_client: boolean;
  sort_order: number;
};

export type TimeEntryRow = {
  id: string;
  hours: number | string;
  worked_on: string;
  notes: string;
  staff_id: string;
  sprint_item_id: string | null;
};
