const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isBlockedIpv4(host: string): boolean {
  const m = host.match(IPV4_RE);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').replace(/\.+$/, '').toLowerCase();
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (host === '0.0.0.0' || host === '::' || host === '::1') return true;
  if (host === 'metadata.google.internal') return true;
  if (host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return true;
  if (isBlockedIpv4(host)) return true;
  return false;
}

function allowlistHosts(): string[] {
  return String(process.env.CODIVA_SAAS_PUSH_HOST_ALLOWLIST || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function hostAllowed(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const allow = allowlistHosts();
  if (!allow.length) return true;
  return allow.some((rule) => {
    if (rule.startsWith('.')) return host.endsWith(rule) || host === rule.slice(1);
    return host === rule || host.endsWith(`.${rule}`);
  });
}

/** HTTPS público para fetch servidor. Vacío → null. */
export function optionalSafeOutboundUrl(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  return assertSafeOutboundUrl(trimmed);
}

export function assertSafeOutboundUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error('URL de instancia inválida. Usa https:// con un hostname público.');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('La URL de instancia debe ser https');
  }
  if (parsed.username || parsed.password) {
    throw new Error('La URL de instancia no puede llevar credenciales');
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error('La URL de instancia no puede apuntar a una red privada');
  }
  if (!parsed.hostname.includes('.') && !parsed.hostname.includes(':')) {
    throw new Error('URL de instancia inválida');
  }
  if (!hostAllowed(parsed.hostname)) {
    throw new Error('Ese host no está permitido para push de licencia');
  }
  return parsed.toString();
}

export function safeOutboundOrigin(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  try {
    const url = assertSafeOutboundUrl(trimmed);
    return new URL(url).origin;
  } catch {
    return null;
  }
}
