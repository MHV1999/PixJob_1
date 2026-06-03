'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { verifyEmailSchema, type VerifyEmailFormValues } from '@/lib/validations/auth.schema';
import { authApi } from '@/lib/auth-api';

export function VerifyEmailForm(): ReactNode {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      // Pre-fill token from URL query param if present (?token=...)
      token: searchParams.get('token') ?? '',
    },
  });

  const onSubmit = async (data: VerifyEmailFormValues): Promise<void> => {
    setServerError(null);
    try {
      await authApi.verifyEmail(data);
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/login`), 2000);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  if (success) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-lg font-semibold text-green-700 dark:text-green-400">Email verified!</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">Redirecting to login…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Verify your email</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Enter the verification token from the email we sent you.
      </p>

      {serverError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {serverError}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="token" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Verification token
        </label>
        <input
          id="token"
          type="text"
          {...register('token')}
          className="w-full rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          aria-invalid={!!errors.token}
          aria-describedby={errors.token ? 'token-error' : undefined}
          placeholder="Paste your verification token here"
        />
        {errors.token && (
          <p id="token-error" className="text-xs text-red-600">{errors.token.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
      >
        {isSubmitting ? 'Verifying…' : 'Verify email'}
      </button>
    </form>
  );
}
