export type OpsJobPostingRow = {
  id: string;
  slug: string;
  title: string;
  location: string | null;
  employment_type: string | null;
  status: string;
  updated_at: string;
  careers_pipeline?: boolean | null;
  requires_hunt?: boolean | null;
  asks_discipline?: boolean | null;
};

export type OpsJobApplicationRow = {
  id: string;
  job_posting_id?: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  discipline: string | null;
  status: string;
  created_at: string;
  personnel_offer_id: string | null;
  original_filename: string | null;
  assessment_attempt_id?: string | null;
  cover_letter?: string | null;
  ops_job_postings:
    | { title: string; slug: string; careers_pipeline?: boolean | null; asks_discipline?: boolean | null }
    | { title: string; slug: string; careers_pipeline?: boolean | null; asks_discipline?: boolean | null }[]
    | null;
};

export type OpsHuntReportRow = {
  id: string;
  full_name: string;
  email: string;
  page_url: string;
  title: string;
  description?: string | null;
  expected?: string | null;
  matched_seed_id: string | null;
  discipline?: string | null;
  assessment_attempt_id?: string | null;
  review_status?: string | null;
  evidence_paths?: string[] | null;
  created_at: string;
};

export type OpsJobAttemptRow = {
  id: string;
  job_posting_id: string;
  catalog_key?: string | null;
  full_name: string;
  email: string;
  status: string;
  score_pct: number | null;
  passed: boolean | null;
  duration_ms: number | null;
  blur_count: number | null;
  started_at: string;
  completed_at: string | null;
  timezone: string | null;
  attempt_number: number | null;
  ip_hash?: string | null;
  user_agent?: string | null;
};

export type OpsPersonnelOfferLink = {
  email: string | null;
  career_email?: string | null;
  status: string;
};
