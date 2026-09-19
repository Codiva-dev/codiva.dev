import { createAdminClient } from '@/lib/supabase/admin';

export type AuthUserEmailClient = {
  auth: {
    admin: {
      getUserById: (id: string) => Promise<{ data: { user?: { email?: string | null } | null } }>;
    };
  };
};

export async function emailsByUserIds(
  admin: AuthUserEmailClient,
  userIds: Iterable<string>
): Promise<Map<string, string>> {
  const unique = [...new Set([...userIds].map((id) => id.trim()).filter(Boolean))];
  const emails = new Map<string, string>();
  if (!unique.length) return emails;

  await Promise.all(
    unique.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      const email = data.user?.email?.trim();
      if (email) emails.set(id, email);
    })
  );
  return emails;
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const normalized = email.toLowerCase().trim();
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('listUsers:', error);
      return null;
    }
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}
