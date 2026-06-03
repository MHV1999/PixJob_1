'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuthStore } from '@/stores/auth.store';
import type { UserRole } from '@pixjob/shared-types';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  /** Path to redirect unauthenticated users. Defaults to /login */
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRoles,
  redirectTo,
}: ProtectedRouteProps): ReactNode {
  const router = useRouter();
  const locale = useLocale();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      const path = redirectTo ?? `/${locale}/login`;
      router.replace(path);
      return;
    }

    if (requiredRoles && user) {
      const hasAccess = requiredRoles.some((role) => user.roles.includes(role));
      if (!hasAccess) {
        router.replace(`/${locale}`);
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRoles, router, locale, redirectTo]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    );
  }

  return <>{children}</>;
}
