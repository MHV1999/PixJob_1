'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth.schema';
import { authApi } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/auth.store';

export function LoginForm(): ReactNode {
  const router = useRouter();
  const locale = useLocale();
  const { setAuth } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormValues): Promise<void> => {
    setServerError(null);
    try {
      const response = await authApi.login(data);
      setAuth(response.user, response.accessToken);
      router.push(`/${locale}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sign in</h2>

      {serverError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {serverError}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="identifier" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Email or username
        </label>
        <input
          id="identifier"
          type="text"
          autoComplete="username"
          {...register('identifier')}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          aria-invalid={!!errors.identifier}
          aria-describedby={errors.identifier ? 'identifier-error' : undefined}
        />
        {errors.identifier && (
          <p id="identifier-error" className="text-xs text-red-600">{errors.identifier.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        {errors.password && (
          <p id="password-error" className="text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Don&apos;t have an account?{' '}
        <Link href={`/${locale}/register`} className="font-medium text-brand-600 hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}
