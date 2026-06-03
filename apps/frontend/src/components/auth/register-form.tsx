'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { registerSchema, type RegisterFormValues } from '@/lib/validations/auth.schema';
import { authApi } from '@/lib/auth-api';

export function RegisterForm(): ReactNode {
  const router = useRouter();
  const locale = useLocale();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormValues): Promise<void> => {
    setServerError(null);
    try {
      await authApi.register(data);
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/verify-email`), 1500);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  if (success) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-lg font-semibold text-green-700 dark:text-green-400">Account created!</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Redirecting to email verification…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create account</h2>

      {serverError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            First name
          </label>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            {...register('firstName')}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Last name
          </label>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            {...register('lastName')}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Email <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Username <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          {...register('username')}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          aria-required="true"
          aria-invalid={!!errors.username}
          aria-describedby={errors.username ? 'username-error' : undefined}
        />
        {errors.username && (
          <p id="username-error" className="text-xs text-red-600">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="reg-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Password <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          aria-required="true"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'reg-password-error' : 'reg-password-hint'}
        />
        <p id="reg-password-hint" className="text-xs text-gray-500">
          Minimum 8 chars with uppercase, lowercase, number and symbol.
        </p>
        {errors.password && (
          <p id="reg-password-error" className="text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
      >
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link href={`/${locale}/login`} className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
