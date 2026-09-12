import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Bell,
    BookOpen,
    Bookmark,
    BriefcaseBusiness,
    Compass,
    Bot,
    Workflow,
    Code2,
    Rocket,
    Megaphone,
    ShoppingBag,
    Package,
    Video,
    ChartNoAxesCombined,
    Sprout,
    X,
    Settings,
} from 'lucide-react';
import { WorkbineBrand } from '@/components/community';
import type { User } from '@/types';

const icons = [
    Bot,
    Workflow,
    Code2,
    Rocket,
    Megaphone,
    BriefcaseBusiness,
    ShoppingBag,
    Package,
    Video,
    ChartNoAxesCombined,
];

export function CommunitySidebar({
    categories,
    category,
    open,
    expanded,
    onClose,
}: {
    categories: Record<string, string>;
    category: string;
    open: boolean;
    expanded: boolean;
    onClose: () => void;
}) {
    const { props, url } = usePage<{
        auth: { user: User | null };
        unreadNotifications: number;
    }>();
    const user = props.auth?.user;
    const unread = props.unreadNotifications ?? 0;
    const [path, query = ''] = url.split('?');
    const discovery = path === '/' || path === '/topics';
    const ownTopics = Boolean(
        user && path === `/members/${user.username}` &&
        new URLSearchParams(query).get('view') === 'topics',
    );

    return (
        <>
            {open && (
                <button
                    type="button"
                    className="wb-sidebar-shade"
                    aria-label="Close navigation backdrop"
                    tabIndex={-1}
                    onClick={onClose}
                />
            )}
            <aside
                className={`wb-community-sidebar ${open ? 'is-open' : ''}`}
                id="community-navigation"
                aria-label="Community navigation"
                role={open ? 'dialog' : undefined}
                aria-modal={open ? true : undefined}
                inert={!expanded && !open}
            >
                <div className="wb-sidebar-brand">
                    <WorkbineBrand onNavigate={onClose} />
                    <button
                        type="button"
                        className="wb-sidebar-close"
                        aria-label="Close navigation"
                        data-navigation-close
                        onClick={onClose}
                    >
                        <X aria-hidden="true" />
                    </button>
                </div>
                <nav aria-label="Community">
                    <Link
                        href="/topics"
                        onClick={onClose}
                        aria-current={discovery && !category ? 'page' : undefined}
                    >
                        <Compass aria-hidden="true" />
                        Explore
                    </Link>
                    <Link
                        href={user ? `/members/${user.username}?view=topics` : '/login'}
                        onClick={onClose}
                        aria-current={ownTopics ? 'page' : undefined}
                    >
                        <BookOpen aria-hidden="true" />
                        My topics
                    </Link>
                    <Link
                        href="/saved"
                        onClick={onClose}
                        aria-current={path === '/saved' ? 'page' : undefined}
                    >
                        <Bookmark aria-hidden="true" />
                        Bookmarks
                    </Link>
                    <Link
                        href="/notifications"
                        onClick={onClose}
                        aria-current={path === '/notifications' ? 'page' : undefined}
                    >
                        <Bell aria-hidden="true" />
                        Notifications
                        {unread > 0 && (
                            <span className="wb-sidebar-count" aria-label={`${unread} unread`}>
                                {unread > 99 ? '99+' : unread}
                            </span>
                        )}
                    </Link>
                    <Link
                        href="/community/guide"
                        onClick={onClose}
                        aria-current={path === '/community/guide' ? 'page' : undefined}
                    >
                        <BookOpen aria-hidden="true" />
                        Community guide
                    </Link>
                    {user && (
                        <Link
                            href="/settings/profile"
                            onClick={onClose}
                            aria-current={path.startsWith('/settings/') ? 'page' : undefined}
                        >
                            <Settings aria-hidden="true" />
                            Account settings
                        </Link>
                    )}
                </nav>
                {Object.keys(categories).length > 0 && (
                    <>
                        <p className="wb-sidebar-label">Categories</p>
                        <nav aria-label="Categories">
                            {Object.entries(categories).map(([value, label], i) => {
                                const Icon = icons[i] ?? BookOpen;
                                return (
                                    <Link
                                        key={value}
                                        href={`/topics?category=${encodeURIComponent(value)}#topics`}
                                        preserveState
                                        onClick={onClose}
                                        aria-current={discovery && category === value ? 'page' : undefined}
                                    >
                                        <Icon aria-hidden="true" />
                                        {label}
                                    </Link>
                                );
                            })}
                            <Link href="/topics#topics" preserveState onClick={onClose}>
                                <Compass aria-hidden="true" />
                                All topics
                            </Link>
                        </nav>
                    </>
                )}
                <div className="wb-sidebar-invite">
                    <Sprout aria-hidden="true" />
                    <strong>Small steps.<br />Big impact.</strong>
                    <p>Share something you learned. Help someone get started.</p>
                    <Link href="/topics/create" onClick={onClose}>
                        Create topic <ArrowRight aria-hidden="true" />
                    </Link>
                </div>
            </aside>
        </>
    );
}
