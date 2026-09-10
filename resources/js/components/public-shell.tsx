import { Link, usePage } from '@inertiajs/react';
import { ArrowUpRight, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';

type PublicPageProps = {
    auth: {
        user: User | null;
    };
};

type Props = {
    children: ReactNode;
};

export function PublicShell({ children }: Props) {
    const { auth } = usePage<PublicPageProps>().props;

    return (
        <div className="bg-background text-foreground flex min-h-screen flex-col">
            <a
                href="#main-content"
                className="bg-background focus:ring-ring sr-only z-50 rounded-md px-4 py-3 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-2"
            >
                Skip to content
            </a>

            <header className="border-border/70 bg-background/95 sticky top-0 z-20 border-b backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
                    <Link
                        href="/"
                        aria-label="Workbine home"
                        className="focus-visible:ring-ring flex shrink-0 items-center gap-2.5 rounded-md font-semibold tracking-tight focus-visible:ring-2 focus-visible:outline-none"
                    >
                        <span className="flex size-9 -rotate-6 items-center justify-center rounded-xl bg-teal-700 text-lg font-bold text-white shadow-sm dark:bg-teal-400 dark:text-teal-950">
                            W
                        </span>
                        <span className="text-lg">Workbine</span>
                    </Link>

                    <nav
                        aria-label="Main navigation"
                        className="flex flex-wrap items-center gap-1 sm:gap-2"
                    >
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/topics">Explore</Link>
                        </Button>

                        {auth.user ? (
                            <>
                                <Button asChild variant="ghost" size="sm">
                                    <Link
                                        href="/settings/profile"
                                        aria-label={`Account settings for ${auth.user.name}`}
                                    >
                                        <UserRound aria-hidden="true" />
                                        <span className="hidden max-w-28 truncate sm:inline">
                                            {auth.user.name}
                                        </span>
                                    </Link>
                                </Button>
                                <Button asChild size="sm">
                                    <Link href="/topics/create">
                                        Start a topic
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button asChild variant="ghost" size="sm">
                                    <Link href="/login">Log in</Link>
                                </Button>
                                <Button asChild size="sm">
                                    <Link href="/register">Join Workbine</Link>
                                </Button>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <div
                id="main-content"
                tabIndex={-1}
                className="flex-1 outline-none"
            >
                {children}
            </div>

            <footer className="border-border/70 mt-8 border-t">
                <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                    <p className="text-muted-foreground">
                        <span className="text-foreground font-semibold">
                            Workbine.
                        </span>{' '}
                        Practical knowledge, shared person to person.
                    </p>
                    <Link
                        href="/topics/create"
                        className="focus-visible:ring-ring inline-flex w-fit items-center gap-1 rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                    >
                        Bring a good question
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                </div>
            </footer>
        </div>
    );
}
