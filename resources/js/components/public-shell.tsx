import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    Bookmark,
    Bell,
    BookOpen,
    ChevronDown,
    LogOut,
    Settings,
    UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
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
import '../../css/community-shell.css';

type Props = {
    children: ReactNode;
    discovery?: {
        categories: Record<string, string>;
        category: string;
        search: ReactNode;
    };
};

export function PublicShell({ children, discovery }: Props) {
    const { props, url } = usePage<{
        auth: { user: User | null };
        canModerate: boolean;
        unreadNotifications: number;
        sidebarOpen?: boolean;
        communityCategories?: Record<string, string>;
    }>();
    // Branded error pages deliberately omit private shared props.
    const user = props.auth?.user;
    const unread = props.unreadNotifications ?? 0;
    const [sidebarExpanded, setSidebarExpanded] = useState(
        props.sidebarOpen ?? true,
    );
    const [navigationOpen, setNavigationOpen] = useState(false);
    const mobileTrigger = useRef<HTMLButtonElement>(null);
    const desktopTrigger = useRef<HTMLButtonElement>(null);

    useEffect(() => router.on('navigate', () => setNavigationOpen(false)), []);
    useEffect(() => {
        if (!navigationOpen) return;
        const menu = document.getElementById('community-navigation');
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const focusable = () =>
            Array.from(
                menu?.querySelectorAll<HTMLElement>(
                    'a[href], button:not(:disabled)',
                ) ?? [],
            ).filter((element) => element.offsetParent !== null);
        menu?.querySelector<HTMLElement>('[data-navigation-close]')?.focus();
        const close = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setNavigationOpen(false);
            }
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
            // The content's inert state is removed before passive cleanup.
            const trigger = desktop.matches
                ? desktopTrigger.current
                : mobileTrigger.current;
            if (trigger?.isConnected) trigger.focus();
        };
    }, [navigationOpen]);

    const toggleSidebar = () => {
        const expanded = !sidebarExpanded;
        setSidebarExpanded(expanded);
        document.cookie = `sidebar_state=${expanded}; path=/; max-age=604800; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    };
    const path = url.split(/[?#]/)[0];
    const composingTopic = path === '/topics/create';
    const categories = discovery?.categories ?? props.communityCategories ?? {};
    const category = discovery?.category ?? '';

    return (
        <div
            className={`wb-public wb-cosmos-shell min-h-screen ${discovery ? 'wb-discovery-shell' : 'wb-secondary-shell'} ${sidebarExpanded ? '' : 'is-sidebar-collapsed'}`}
        >
            <a href="#main-content" className="wb-skip" inert={navigationOpen}>
                Skip to content
            </a>
            {discovery && <CommunityUniverse />}
            <CommunitySidebar
                categories={categories}
                category={category}
                open={navigationOpen}
                expanded={sidebarExpanded}
                onClose={() => setNavigationOpen(false)}
            />
            <div className="wb-shell-body" inert={navigationOpen}>
                <header className="wb-topbar">
                    <div className="wb-topbar-inner">
                        <button
                            ref={mobileTrigger}
                            type="button"
                            className="wb-navigation-toggle"
                            aria-label="Open navigation"
                            aria-expanded={navigationOpen}
                            aria-controls="community-navigation"
                            onClick={() => setNavigationOpen(true)}
                        >
                            <Menu aria-hidden="true" />
                        </button>
                        <button
                            ref={desktopTrigger}
                            type="button"
                            className="wb-desktop-sidebar-toggle"
                            aria-label={
                                sidebarExpanded
                                    ? 'Collapse sidebar'
                                    : 'Expand sidebar'
                            }
                            title={
                                sidebarExpanded
                                    ? 'Collapse sidebar'
                                    : 'Expand sidebar'
                            }
                            aria-expanded={sidebarExpanded}
                            aria-controls="community-navigation"
                            onClick={toggleSidebar}
                        >
                            {sidebarExpanded ? (
                                <PanelLeftClose aria-hidden="true" />
                            ) : (
                                <PanelLeftOpen aria-hidden="true" />
                            )}
                        </button>
                        <div className="wb-brand-group">
                            <WorkbineBrand />
                            <Link
                                href="/topics"
                                className="wb-explore-link"
                                aria-current={
                                    path === '/' || path === '/topics'
                                        ? 'page'
                                        : undefined
                                }
                            >
                                Explore
                            </Link>
                        </div>
                        {discovery ? (
                            <div className="wb-universe-search">
                                {discovery.search}
                            </div>
                        ) : (
                            <Link href="/topics" className="wb-shell-home-link">
                                Explore the community
                            </Link>
                        )}
                        <nav
                            aria-label="Main navigation"
                            className="wb-main-nav"
                        >
                            <Link
                                href="/community/guide"
                                className="wb-community-link"
                            >
                                Community guide
                            </Link>
                            {user ? (
                                <>
                                    <Link
                                        className="wb-personal-link"
                                        href={`/members/${user.username}?view=topics`}
                                    >
                                        My topics
                                    </Link>
                                    <Link
                                        className="wb-personal-link"
                                        href="/saved"
                                        aria-current={
                                            path === '/saved'
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
                                            unread > 0
                                                ? `Notifications, ${unread} unread`
                                                : 'Notifications'
                                        }
                                        aria-current={
                                            path === '/notifications'
                                                ? 'page'
                                                : undefined
                                        }
                                    >
                                        <Bell
                                            aria-hidden="true"
                                            className="size-5"
                                        />
                                        {unread > 0 && (
                                            <span
                                                className="wb-notification-dot"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </Link>
                                    <a href="mailto:hello@workbine.com">
                                        Contact
                                    </a>
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
                                                    name={user.name}
                                                    src={user.avatar_url}
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
                                                {user.name}
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
                                                    href={`/members/${user.username}?view=topics`}
                                                >
                                                    <BookOpen aria-hidden="true" />
                                                    My topics
                                                </Link>
                                            </DropdownMenuItem>
                                            {props.canModerate && (
                                                <DropdownMenuItem asChild>
                                                    <Link href="/moderation">
                                                        Moderation
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem asChild>
                                                <Link
                                                    href={`/members/${user.username}`}
                                                >
                                                    <UserRound aria-hidden="true" />
                                                    My public profile
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link
                                                    href="/saved"
                                                    aria-current={
                                                        path === '/saved'
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
                                        <Link href="/register">
                                            Join Workbine
                                        </Link>
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
                            <strong>workbine.</strong>Practical knowledge,
                            shared person to person.
                        </p>
                        <div className="flex flex-wrap gap-5">
                            <Link href="/community/guide">Community guide</Link>
                            <Link href="/community/reputation">
                                How reputation works
                            </Link>
                            <a href="mailto:hello@workbine.com">Contact</a>
                            {!composingTopic && (
                                <Link href="/topics/create">Start a topic</Link>
                            )}
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
