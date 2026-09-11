import type { ReactNode } from 'react';
import { PublicShell } from '@/components/public-shell';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: ReactNode;
}) {
    return (
        <PublicShell>
            <main className="wb-page">{children}</main>
        </PublicShell>
    );
}
