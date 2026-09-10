import { Link, usePage } from '@inertiajs/react';
import { ArrowUpRight, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';
import '../../css/workbine.css';

type Props = { children: ReactNode };

export function PublicShell({ children }: Props) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;

    return (
        <div className="wb-public flex min-h-screen flex-col">
            <a href="#main-content" className="bg-background sr-only z-50 px-4 py-3 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>
            <header className="wb-topbar">
                <div className="wb-topbar-inner">
                    <div className="wb-brand">
                        <Link href="/" aria-label="Workbine home" className="wb-wordmark">
                            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                                <path d="M3 7L9 25L16 9L23 25L29 7M5 16H27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" />
                            </svg>
                            <span>workbine<i>.</i></span>
                        </Link>
                        <span className="wb-tagline">Practical knowledge,<br />together.</span>
                    </div>
                    <nav aria-label="Main navigation" className="wb-main-nav">
                        <Link href="/topics" className="wb-toplink">Community</Link>
                        <Link href="/#field-guide" className="wb-toplink">Field guide</Link>
                        {auth.user ? (
                            <>
                                <Link href="/settings/profile" aria-label={`Account settings for ${auth.user.name}`} className="inline-flex items-center gap-2">
                                    <UserRound className="size-4" aria-hidden="true" />
                                    <span className="hidden max-w-24 truncate sm:inline">{auth.user.name}</span>
                                </Link>
                                <Button asChild size="sm"><Link href="/topics/create">Start a topic<ArrowUpRight aria-hidden="true" /></Link></Button>
                            </>
                        ) : (
                            <>
                                <Link href="/login">Log in</Link>
                                <Button asChild size="sm"><Link href="/register">Join Workbine</Link></Button>
                            </>
                        )}
                    </nav>
                </div>
            </header>
            <div id="main-content" tabIndex={-1} className="flex-1 outline-none">{children}</div>
            <footer className="wb-footer">
                <div className="wb-footer-inner">
                    <p><strong>workbine.</strong>A shared notebook, not a feed of promises.</p>
                    <Link href="/topics/create">Leave something useful behind ↗</Link>
                </div>
            </footer>
        </div>
    );
}
