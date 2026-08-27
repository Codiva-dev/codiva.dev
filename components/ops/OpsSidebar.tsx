'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Inbox,
  Users,
  FolderKanban,
  Ticket,
  LogOut,
  Settings,
  ContactRound,
  UserCog,
  Building2,
  Gauge,
  Kanban,
  ListTodo,
  PanelLeftClose,
} from 'lucide-react';
import { canAny, type Capability, type PermissionSubject } from '@/lib/ops/permissions';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import CodivaWordmarkMark from '@/components/CodivaWordmarkMark';

const NAV: {
  href: string;
  labelKey: string;
  icon: typeof Inbox;
  capability?: Capability | Capability[] | null;
}[] = [
  { href: '/leads', labelKey: 'ops.nav.leads', icon: Users, capability: 'leads' },
  { href: '/inbox', labelKey: 'ops.nav.inbox', icon: Inbox, capability: 'inbox' },
  { href: '/projects', labelKey: 'ops.nav.projects', icon: FolderKanban },
  { href: '/workload', labelKey: 'ops.nav.workload', icon: Gauge, capability: 'workload' },
  { href: '/pendientes', labelKey: 'ops.nav.pendientes', icon: ListTodo, capability: 'assignments' },
  { href: '/asignaciones', labelKey: 'ops.nav.asignaciones', icon: Kanban, capability: 'assignments' },
  { href: '/organizations', labelKey: 'ops.nav.organizations', icon: Building2, capability: 'organizations' },
  { href: '/users', labelKey: 'ops.nav.users', icon: ContactRound, capability: 'portal_users' },
  { href: '/tickets', labelKey: 'ops.nav.tickets', icon: Ticket, capability: 'tickets' },
  { href: '/team', labelKey: 'ops.nav.team', icon: UserCog, capability: ['team', 'careers_review'] },
  { href: '/settings', labelKey: 'ops.nav.settings', icon: Settings, capability: 'settings_profile' },
];

export default function OpsSidebar({
  staffName,
  staffPermissions,
  pendingCount = 0,
  onHide,
  onNavigate,
}: {
  staffName: string;
  staffPermissions?: PermissionSubject;
  pendingCount?: number;
  onHide?: () => void;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  const normalized = pathname.replace(/^\/ops/, '') || '/dashboard';
  const items = NAV.filter((item) => {
    if (!item.capability) return true;
    const caps = Array.isArray(item.capability) ? item.capability : [item.capability];
    return canAny(staffPermissions ?? 'dev', caps);
  });

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex h-full w-full min-w-0 flex-col lg:w-64 lg:min-w-64">
      <div className="flex items-start justify-between gap-2 border-b border-zinc-200 px-5 py-5">
        <div className="min-w-0">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="inline-flex rounded-md outline-offset-2 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-codiva-primary"
            aria-label={t('ops.layout.home')}
          >
            <CodivaWordmarkMark size="sm" />
          </Link>
          <p className="mt-1 truncate text-sm text-zinc-600">{staffName}</p>
        </div>
        {onHide ? (
          <button
            type="button"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-800 shadow-sm transition hover:bg-zinc-50 lg:flex"
            onClick={onHide}
            aria-expanded
            aria-controls="ops-sidebar-panel"
            aria-label={t('ops.layout.hideSidebar')}
          >
            <PanelLeftClose className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {items.map(({ href, labelKey, icon: Icon }) => {
          const active = normalized === href || normalized.startsWith(`${href}/`);
          const showBadge = href === '/pendientes' && pendingCount > 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-codiva-primary text-white'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{t(labelKey)}</span>
              {showBadge ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                    active ? 'bg-white text-codiva-primary' : 'bg-codiva-primary text-white'
                  }`}
                >
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 border-t border-zinc-200 p-3">
        <div className="flex justify-center py-1">
          <LanguageSwitcher />
        </div>
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
        >
          <LogOut className="h-4 w-4" />
          {t('ops.signOut')}
        </button>
      </div>
    </aside>
  );
}
