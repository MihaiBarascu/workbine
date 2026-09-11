import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Bookmark,
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
import '../../css/community-clarity.css';

type Props = { children: ReactNode };

export function PublicShell({ children }: Props) {
    const {
        props: { auth },
        url,
    } = usePage<{ auth: { user: User | null } }>();
    const composingTopic = url.split('?')[0] === '/topics/create';

    return (
        <div className="wb-public flex min-h-screen flex-col">
            <a href="#main-content" className="wb-skip">
                Skip to content
            </a>
            <header className="wb-topbar">
                <div className="wb-topbar-inner">
                    <div className="wb-brand-group">
                        <WorkbineBrand />
                        <Link
                            href="/topics"
                            className="wb-explore-link"
                            aria-current={
                                url === '/' || url.split('?')[0] === '/topics'
                                    ? 'page'
                                    : undefined
                            }
                        >
                            Explore
                        </Link>
                    </div>
                    <nav aria-label="Main navigation" className="wb-main-nav">
                        <Link
                            href="/topics#field-guide"
                            className="wb-community-link"
                        >
                            Community guide
                        </Link>
                        {auth.user ? (
                            <>
                                {!composingTopic && (
                                    <Button
                                        asChild
                                        size="sm"
                                        className="wb-start-button"
                                    >
                                        <Link href="/topics/create">
                                            Start a topic
                                            <ArrowRight aria-hidden="true" />
                                        </Link>
                                    </Button>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="wb-account-trigger"
                                            aria-label="Account menu"
                                        >
                                            <MemberAvatar
                                                name={auth.user.name}
                                                src={auth.user.avatar_url}
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
                                                href={`/members/${auth.user.username}`}
                                            >
                                                <UserRound aria-hidden="true" />
                                                My public profile
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link
                                                href="/saved"
                                                aria-current={
                                                    url.split('?')[0] ===
                                                    '/saved'
                                                        ? 'page'
                                                        : undefined
                                                }
                                            >
                                                <Bookmark aria-hidden="true" />
                                                Saved topics
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
                        <Link href="/community/reputation">
                            How reputation works
                        </Link>
                        {!composingTopic && (
                            <Link href="/topics/create">Start a topic</Link>
                        )}
                    </div>
                </div>
            </footer>
        </div>
    );
}
