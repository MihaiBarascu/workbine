import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Menu,
    Bookmark,
    Bell,
    BookOpen,
    ChevronDown,
    LogOut,
    Settings,
    UserRound,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { CommunityUniverse } from '@/components/community-universe';
import { CommunitySidebar } from '@/components/community-sidebar';
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
import '../../css/community-launch.css';
import '../../css/community-universe.css';

type Props = {
    children: ReactNode;
    discovery?: {
        categories: Record<string, string>;
        category: string;
        search: ReactNode;
    };
};

export function PublicShell({ children, discovery }: Props) {
    const {
        props: { auth, canModerate, unreadNotifications },
        url,
    } = usePage<{
        auth: { user: User | null };
        canModerate: boolean;
        unreadNotifications: number;
    }>();
    const [navigationOpen, setNavigationOpen] = useState(false);
    useEffect(() => {
        if (!navigationOpen) return;
        const menu = document.getElementById('community-navigation');
        const previousFocus =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const focusable = () =>
            Array.from(
                menu?.querySelectorAll<HTMLElement>('a[href], button') ?? [],
            ).filter((element) => element.offsetParent !== null);
        focusable()[0]?.focus();
        const close = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setNavigationOpen(false);
            if (event.key === 'Tab') {
                const items = focusable();
                const first = items[0];
                const last = items.at(-1);
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first?.focus();
                }
            }
        };
        const desktop = window.matchMedia('(min-width: 1051px)');
        const resized = () => {
            if (desktop.matches) setNavigationOpen(false);
        };
        desktop.addEventListener('change', resized);
        window.addEventListener('keydown', close);
        return () => {
            window.removeEventListener('keydown', close);
            desktop.removeEventListener('change', resized);
            document.body.style.overflow = previousOverflow;
            previousFocus?.focus();
        };
    }, [navigationOpen]);
    const composingTopic = url.split('?')[0] === '/topics/create';

    return (
        <div
            className={`wb-public flex min-h-screen flex-col ${discovery ? 'wb-cosmos-shell' : ''}`}
        >
            <a href="#main-content" className="wb-skip">
                Skip to content
            </a>
            {discovery && (
                <>
                    <CommunityUniverse />
                    <CommunitySidebar
                        categories={discovery.categories}
                        category={discovery.category}
                        open={navigationOpen}
                        onClose={() => setNavigationOpen(false)}
                    />
                </>
            )}

            <header className="wb-topbar">
                <div className="wb-topbar-inner">
                    {discovery && (
                        <button
                            className="wb-navigation-toggle"
                            aria-label="Open navigation"
                            aria-expanded={navigationOpen}
                            aria-controls="community-navigation"
                            onClick={() => setNavigationOpen(!navigationOpen)}
                        >
                            <Menu />
                        </button>
                    )}
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
                    {discovery && (
                        <div className="wb-universe-search">
                            {discovery.search}
                        </div>
                    )}
                    <nav aria-label="Main navigation" className="wb-main-nav">
                        <Link
                            href="/community/guide"
                            className="wb-community-link"
                        >
                            Community guide
                        </Link>
                        {auth.user ? (
                            <>
                                <Link
                                    className="wb-personal-link"
                                    href={`/members/${auth.user.username}?view=topics`}
                                >
                                    My topics
                                </Link>
                                <Link
                                    className="wb-personal-link"
                                    href="/saved"
                                    aria-current={
                                        url.split('?')[0] === '/saved'
                                            ? 'page'
                                            : undefined
                                    }
                                >
                                    Saved
                                </Link>
                                <Link
                                    href="/notifications"
                                    className="wb-notifications-link"
                                    aria-label={
                                        unreadNotifications > 0
                                            ? `Notifications, ${unreadNotifications} unread`
                                            : 'Notifications'
                                    }
                                    aria-current={
                                        url.split('?')[0] === '/notifications'
                                            ? 'page'
                                            : undefined
                                    }
                                >
                                    <Bell
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                    {unreadNotifications > 0 && (
                                        <span
                                            className="wb-notification-dot"
                                            aria-hidden="true"
                                        />
                                    )}
                                </Link>
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
                                            <Link href="/topics">
                                                <BookOpen aria-hidden="true" />
                                                Explore
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link
                                                href={`/members/${auth.user.username}?view=topics`}
                                            >
                                                <BookOpen aria-hidden="true" />
                                                My topics
                                            </Link>
                                        </DropdownMenuItem>
                                        {canModerate && (
                                            <DropdownMenuItem asChild>
                                                <Link href="/moderation">
                                                    Moderation
                                                </Link>
                                            </DropdownMenuItem>
                                        )}
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
                        <Link href="/community/guide">Community guide</Link>
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
