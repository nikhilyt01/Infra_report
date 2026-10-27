import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import InstallPWA from '@/components/InstallPWA';
import RegisterServiceWorker from '@/components/RegisterServiceWorker';
import AccessibilityFeatures from '@/components/AccessibilityFeatures';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

import { ToastProvider } from '@/contexts/ToastContext';

export default async function LocaleLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    let messages;
    try {
        messages = (await import(`@/messages/${locale}.json`)).default;
    } catch (error) {
        notFound();
    }

    return (
        <html lang={locale} className={inter.variable}>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <meta name="theme-color" content="#3b82f6" />
                <link rel="manifest" href="/manifest.json" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="InfraReport" />
            </head>
            <body className="font-sans antialiased bg-background text-foreground min-h-screen selection:bg-blue-600 selection:text-white">
                {/* Skip to Main Content Link */}
                <a href="#main-content" className="skip-to-main">
                    Skip to main content
                </a>

                <NextIntlClientProvider locale={locale} messages={messages}>
                    <AuthProvider>
                        <ToastProvider>
                            <RegisterServiceWorker />
                            <AccessibilityFeatures />
                            <KeyboardShortcuts />
                            <main id="main-content">
                                {children}
                            </main>
                            <InstallPWA />
                        </ToastProvider>
                    </AuthProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
