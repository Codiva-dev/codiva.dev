'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

function isOpsStaffSurface(pathname: string, opsHost: boolean) {
  if (opsHost) {
    return !pathname.startsWith('/partner');
  }
  if (!pathname.startsWith('/ops/')) return false;
  if (pathname.startsWith('/ops/p/')) return false;
  if (pathname.startsWith('/ops/portal')) return false;
  if (pathname.startsWith('/ops/entrevistas')) return false;
  if (pathname.startsWith('/ops/partner')) return false;
  return true;
}

export default function ThemeProvider({
  children,
  opsHost = false,
}: {
  children: ReactNode;
  opsHost?: boolean;
}) {
  const pathname = usePathname();
  const enableOpsTheme = isOpsStaffSurface(pathname, opsHost);

  return (
    <NextThemesProvider
      attribute="class"
      forcedTheme={enableOpsTheme ? undefined : 'light'}
      defaultTheme="system"
      enableSystem={enableOpsTheme}
      enableColorScheme={false}
      disableTransitionOnChange
      storageKey="codiva-ops-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
