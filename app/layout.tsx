import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Kardex Pro - Sistema de Inventario',
    description: 'Sistema de invetario profesional',
    icons: {
        icon: '/icon-192.svg',
    },
};

import { Providers } from './providers';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body suppressHydrationWarning>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
