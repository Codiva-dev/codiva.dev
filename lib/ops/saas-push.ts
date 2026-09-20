import { isLicenseStatus, parseLicenseModules, signInstanceLicense } from '@/lib/ops/saas-license';

async function pushToInstance(input: {
  instance_push_url: string | null;
  status: string;
  period_start: string | null;
  period_end: string | null;
  grace_until: string | null;
  modules: string[] | null;
  token: string;
}) {
  const url = input.instance_push_url?.trim();
  const secret = process.env.CODIVA_SAAS_INGEST_SECRET?.trim() ?? '';
  if (!url || !secret) return;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        token: input.token,
        status: input.status,
        periodStart: input.period_start,
        periodEnd: input.period_end,
        graceUntil: input.grace_until,
        modules: input.modules,
        meters: {},
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) console.error('[ops saas push]', res.status);
  } catch (err) {
    console.error('[ops saas push]', err);
  }
}

export async function signAndPushSaasProject(
  supabase: { from: (table: string) => unknown },
  projectId: string
): Promise<string | null> {
  const secret = process.env.CODIVA_LICENSE_SECRET?.trim() ?? '';
  if (!secret) return null;
  const client = supabase as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown }> };
      };
      update: (values: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{ error: unknown }>;
      };
    };
  };
  const { data } = await client.from('saas_instances').select('*').eq('project_id', projectId).maybeSingle();
  if (!data) return null;
  const row = data as {
    id: string;
    instance_key: string;
    status: string;
    period_start: string | null;
    period_end: string | null;
    grace_until: string | null;
    modules: string[] | null;
    instance_push_url: string | null;
  };
  const periodStart = row.period_start
    ? new Date(row.period_start).toISOString()
    : new Date().toISOString();
  const periodEnd = row.period_end
    ? new Date(row.period_end).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const graceUntil = row.grace_until ? new Date(row.grace_until).toISOString() : null;
  const token = await signInstanceLicense(
    {
      sub: row.instance_key,
      status: isLicenseStatus(row.status) ? row.status : 'active',
      modules: parseLicenseModules(row.modules),
      periodStart,
      periodEnd,
      graceUntil,
    },
    secret
  );
  const { error } = await client
    .from('saas_instances')
    .update({
      entitlement_token: token,
      last_pushed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id);
  if (error) {
    console.error('[ops saas sign]', error);
    return null;
  }
  await pushToInstance({
    instance_push_url: row.instance_push_url,
    status: row.status,
    period_start: row.period_start,
    period_end: row.period_end,
    grace_until: row.grace_until,
    modules: row.modules,
    token,
  });
  return token;
}
