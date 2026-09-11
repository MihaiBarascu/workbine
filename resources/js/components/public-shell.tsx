import { Link, usePage } from '@inertiajs/react';
import {
    ArrowUpRight,
    ChevronDown,
    LogOut,
    Settings,
    UserRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { MemberAvatar, WorkbineBrand } from '@/components/community';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { User } from '@/types';
import '../../css/workbine.css';

type Props = { children: ReactNode };

export function PublicShell({ children }: Props) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;

    return (
        <div className="wb-public flex min-h-screen flex-col">
            <a href="#main-content" className="wb-skip">
                Skip to content
            </a>
            <header className="wb-topbar">
                <div className="wb-topbar-inner">
                    <WorkbineBrand />
                    <nav aria-label="Main navigation" className="wb-main-nav">
                        <Link href="/topics" className="wb-community-link">
                            Explore
                        </Link>
                        {auth.user ? (
                            <>
                                <Button
                                    asChild
                                    size="sm"
                                    className="wb-start-button"
                                >
                                    <Link href="/topics/create">
                                        Start a topic
                                        <ArrowUpRight aria-hidden="true" />
                                    </Link>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="wb-account-trigger"
                                            aria-label="Account menu"
                                        >
                                            <MemberAvatar
                                                name={auth.user.name}
                                            />
                                            <ChevronDown
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="end"
                                        className="w-60 p-2"
                                    >
                                        <p className="px-2 py-2 text-sm font-semibold [overflow-wrap:anywhere]">
                                            {auth.user.name}
                                        </p>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link
                                                href={`/members/${auth.user.id}`}
                                            >
                                                <UserRound aria-hidden="true" />
                                                My public profile
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/settings/profile">
                                                <Settings aria-hidden="true" />
                                                Account settings
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link
                                                href="/logout"
                                                method="post"
                                                as="button"
                                                className="w-full"
                                            >
                                                <LogOut aria-hidden="true" />
                                                Log out
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        ) : (
                            <>
                                <Link href="/login">Log in</Link>
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
            <footer className="wb-footer">
                <div className="wb-footer-inner">
                    <p>
                        <strong>workbine.</strong>Practical knowledge, shared
                        person to person.
                    </p>
                    <div className="flex flex-wrap gap-5">
                        <Link href="/#field-guide">Community guide</Link>
                        <Link href="/topics/create">Ask a good question ↗</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
