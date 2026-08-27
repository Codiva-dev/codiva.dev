export type StaffRole = 'admin' | 'pm' | 'dev';

export type Capability =
  | 'leads'
  | 'inbox'
  | 'quotes'
  | 'charges'
  | 'portal_users'
  | 'organizations'
  | 'workload'
  | 'time_entries'
  | 'team'
  | 'careers_review'
  | 'legal_publish'
  | 'projects_all'
  | 'projects_create'
  | 'milestones_write'
  | 'sprints_plan'
  | 'sprints_update_own'
  | 'documents'
  | 'deliverables'
  | 'site_access'
  | 'tickets'
  | 'dashboard_finance'
  | 'settings_profile'
  | 'assignments'
  | 'assignments_manage';

export const ALL_CAPABILITIES = [
  'leads',
  'inbox',
  'quotes',
  'charges',
  'portal_users',
  'organizations',
  'workload',
  'time_entries',
  'team',
  'careers_review',
  'legal_publish',
  'projects_all',
  'projects_create',
  'milestones_write',
  'sprints_plan',
  'sprints_update_own',
  'documents',
  'deliverables',
  'site_access',
  'tickets',
  'dashboard_finance',
  'settings_profile',
  'assignments',
  'assignments_manage',
] as const satisfies readonly Capability[];

export const CAPABILITY_GROUPS = [
  {
    id: 'commercial',
    capabilities: [
      'leads',
      'inbox',
      'quotes',
      'charges',
      'portal_users',
      'organizations',
      'dashboard_finance',
    ] as const satisfies readonly Capability[],
  },
  {
    id: 'workspace',
    capabilities: ['team', 'careers_review', 'legal_publish'] as const satisfies readonly Capability[],
  },
  {
    id: 'projects',
    capabilities: [
      'projects_all',
      'projects_create',
      'milestones_write',
      'sprints_plan',
      'sprints_update_own',
      'workload',
      'assignments',
      'assignments_manage',
    ] as const satisfies readonly Capability[],
  },
  {
    id: 'delivery',
    capabilities: [
      'documents',
      'deliverables',
      'site_access',
      'tickets',
      'time_entries',
      'settings_profile',
    ] as const satisfies readonly Capability[],
  },
] as const;

export const ROLE_CAPABILITY_LIST: Record<StaffRole, readonly Capability[]> = {
  admin: ALL_CAPABILITIES,
  pm: [
    'leads',
    'inbox',
    'quotes',
    'charges',
    'portal_users',
    'organizations',
    'workload',
    'time_entries',
    'careers_review',
    'projects_create',
    'milestones_write',
    'sprints_plan',
    'sprints_update_own',
    'documents',
    'deliverables',
    'site_access',
    'tickets',
    'settings_profile',
    'assignments',
    'assignments_manage',
  ],
  dev: [
    'sprints_update_own',
    'time_entries',
    'documents',
    'deliverables',
    'site_access',
    'tickets',
    'settings_profile',
    'assignments',
  ],
};

const ROLE_CAPABILITIES: Record<StaffRole, ReadonlySet<Capability>> = {
  admin: new Set(ROLE_CAPABILITY_LIST.admin),
  pm: new Set(ROLE_CAPABILITY_LIST.pm),
  dev: new Set(ROLE_CAPABILITY_LIST.dev),
};

const EMPTY_CAPABILITIES: ReadonlySet<Capability> = new Set();

export type PermissionSubject =
  | string
  | {
      role?: string | null;
      capabilities?: string[] | null;
    };

export function isStaffRole(value: string): value is StaffRole {
  return value === 'admin' || value === 'pm' || value === 'dev';
}

export function isCapability(value: string): value is Capability {
  return (ALL_CAPABILITIES as readonly string[]).includes(value);
}

export function capabilitiesFromRole(role: string): Capability[] {
  if (!isStaffRole(role)) return [...ROLE_CAPABILITY_LIST.dev];
  return [...ROLE_CAPABILITY_LIST[role]];
}

export function parseCapabilities(values: Iterable<FormDataEntryValue | string>): Capability[] {
  const selected = new Set<Capability>(['settings_profile']);
  for (const value of values) {
    const raw = String(value);
    if (isCapability(raw)) selected.add(raw);
  }
  return ALL_CAPABILITIES.filter((cap) => selected.has(cap));
}

export function capabilityListEquals(
  left: readonly Capability[],
  right: readonly Capability[]
): boolean {
  if (left.length !== right.length) return false;
  const set = new Set(left);
  return right.every((cap) => set.has(cap));
}

export function isCustomizedCapabilities(role: string, capabilities?: string[] | null): boolean {
  const selected = Array.isArray(capabilities)
    ? parseCapabilities(capabilities)
    : capabilitiesFromRole(role);
  return !capabilityListEquals(selected, capabilitiesFromRole(role));
}

export function diffCapabilities(
  selected: ReadonlySet<Capability>,
  template: ReadonlySet<Capability>
): { extra: Capability[]; missing: number } {
  const extra: Capability[] = [];
  let missing = 0;
  for (const cap of selected) {
    if (cap === 'settings_profile') continue;
    if (!template.has(cap)) extra.push(cap);
  }
  for (const cap of template) {
    if (cap === 'settings_profile') continue;
    if (!selected.has(cap)) missing += 1;
  }
  return { extra, missing };
}

export function capabilitiesFor(subject: PermissionSubject): ReadonlySet<Capability> {
  if (typeof subject === 'string') {
    return isStaffRole(subject) ? ROLE_CAPABILITIES[subject] : EMPTY_CAPABILITIES;
  }
  if (Array.isArray(subject.capabilities)) {
    const set = new Set<Capability>(['settings_profile']);
    for (const cap of subject.capabilities) {
      if (isCapability(cap)) set.add(cap);
    }
    return set;
  }
  return subject.role && isStaffRole(subject.role) ? ROLE_CAPABILITIES[subject.role] : EMPTY_CAPABILITIES;
}

export function can(subject: PermissionSubject, capability: Capability): boolean {
  return capabilitiesFor(subject).has(capability);
}

export function canAny(subject: PermissionSubject, capabilities: Capability[]): boolean {
  return capabilities.some((c) => can(subject, c));
}

/** Nav items that require a capability (or none = all staff). */
export const NAV_CAPABILITY: Record<string, Capability | null> = {
  '/dashboard': null,
  '/leads': 'leads',
  '/inbox': 'inbox',
  '/projects': null,
  '/workload': 'workload',
  '/asignaciones': 'assignments',
  '/pendientes': 'assignments',
  '/organizations': 'organizations',
  '/users': 'portal_users',
  '/tickets': 'tickets',
  '/team': 'careers_review',
  '/settings': 'settings_profile',
};
