import { Link, usePage } from '@inertiajs/react';
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
        <div className="bg-background text-foreground min-h-screen">
            <header className="border-border/70 bg-background/90 sticky top-0 z-20 border-b backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link
                        href="/"
                        className="flex items-center gap-2 font-semibold tracking-tight"
                    >
                        <span className="bg-foreground text-background flex size-8 rotate-3 items-center justify-center rounded-xl text-sm font-bold shadow-sm">
                            W
                        </span>
                        <span>Workbine</span>
                    </Link>

                    <nav className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/topics">Explore</Link>
                        </Button>

                        {auth.user ? (
                            <>
                                <Button asChild variant="ghost" size="sm">
                                    <Link href="/settings/profile">
                                        {auth.user.name}
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

            {children}
        </div>
    );
}
