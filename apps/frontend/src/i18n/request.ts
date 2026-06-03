import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['en', 'fa'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound();

  const messages = (
    await import(`../../messages/${locale}.json`)
  ) as { default: Record<string, string> };

  return {
    messages: messages.default,
    timeZone: 'Asia/Tehran',
  };
});
