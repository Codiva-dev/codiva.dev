import { cookies } from 'next/headers';
import { requireStaff } from '@/lib/ops/auth';
import OpsStaffShell from '@/components/ops/OpsStaffShell';
import { isOpsSidebarOpenCookie, OPS_SIDEBAR_OPEN_COOKIE } from '@/lib/ops/sidebar-pref';
import { can } from '@/lib/ops/permissions';
import { countWorkPending } from '@/lib/ops/work-pending';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { supabase, staff } = await requireStaff();
  const cookieStore = await cookies();
  const sidebarOpen = isOpsSidebarOpenCookie(cookieStore.get(OPS_SIDEBAR_OPEN_COOKIE)?.value);
  const pendingCount = can(staff, 'assignments') ? await countWorkPending(supabase, staff.id) : 0;

  return (
    <OpsStaffShell
      staffName={staff.full_name || 'Staff'}
      staffPermissions={{
        role: staff.role,
        capabilities: Array.isArray(staff.capabilities) ? staff.capabilities : null,
      }}
      pendingCount={pendingCount}
      initialSidebarOpen={sidebarOpen}
    >
      {children}
    </OpsStaffShell>
  );
}
