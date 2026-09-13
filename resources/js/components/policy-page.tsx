import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { PublicShell } from '@/components/public-shell';

export function PolicyPage({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <PublicShell>
            <Head title={title}>
                <meta
                    name="description"
                    content={description}
                    head-key="description"
                />
            </Head>
            <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
                <Link
                    href="/topics"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
                >
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Back to topics
                </Link>
                <header className="mt-8 border-b pb-8">
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        {title}
                    </h1>
                    <p className="text-muted-foreground mt-4 leading-7">
                        {description}
                    </p>
                    <p className="text-muted-foreground mt-4 text-sm">
                        Updated September 13, 2026
                    </p>
                </header>
                <div className="mt-8 space-y-8 leading-7 [overflow-wrap:anywhere] [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:mt-2 [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
                    {children}
                </div>
            </main>
        </PublicShell>
    );
}
