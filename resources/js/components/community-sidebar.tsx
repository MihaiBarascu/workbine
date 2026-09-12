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
    onClose,
}: {
    categories: Record<string, string>;
    category: string;
    open: boolean;
    onClose: () => void;
}) {
    const { auth, unreadNotifications } = usePage<{
        auth: { user: User | null };
        unreadNotifications: number;
    }>().props;
    return (
        <>
            {open && (
                <button
                    className="wb-sidebar-shade"
                    aria-label="Close navigation"
                    onClick={onClose}
                />
            )}
            <aside
                className={`wb-community-sidebar ${open ? 'is-open' : ''}`}
                id="community-navigation"
                aria-label="Community navigation"
                role={open ? 'dialog' : undefined}
                aria-modal={open ? true : undefined}
            >
                <div className="wb-sidebar-brand">
                    <WorkbineBrand onNavigate={onClose} />
                    <button
                        className="wb-sidebar-close"
                        aria-label="Close navigation"
                        onClick={onClose}
                    >
                        <X />
                    </button>
                </div>
                <nav aria-label="Community">
                    <Link
                        href="/topics"
                        onClick={onClose}
                        aria-current={!category ? 'page' : undefined}
                    >
                        <Compass />
                        Explore
                    </Link>
                    <Link
                        href={
                            auth.user
                                ? `/members/${auth.user.username}?view=topics`
                                : '/login'
                        }
                        onClick={onClose}
                    >
                        <BookOpen />
                        My topics
                    </Link>
                    <Link href="/saved" onClick={onClose}>
                        <Bookmark />
                        Bookmarks
                    </Link>
                    <Link href="/notifications" onClick={onClose}>
                        <Bell />
                        Notifications{' '}
                        {unreadNotifications > 0 && (
                            <span className="wb-sidebar-count">
                                {unreadNotifications > 99
                                    ? '99+'
                                    : unreadNotifications}
                            </span>
                        )}
                    </Link>
                </nav>
                <p className="wb-sidebar-label">Categories</p>
                <nav aria-label="Categories">
                    {Object.entries(categories).map(([value, label], i) => {
                        const Icon = icons[i] ?? BookOpen;
                        return (
                            <Link
                                key={value}
                                href={`/topics?category=${value}#topics`}
                                preserveState
                                onClick={onClose}
                                aria-current={
                                    category === value ? 'page' : undefined
                                }
                            >
                                <Icon />
                                {label}
                            </Link>
                        );
                    })}
                    <Link href="/topics#topics" preserveState onClick={onClose}>
                        <Compass />
                        All topics
                    </Link>
                </nav>
                <div className="wb-sidebar-invite">
                    <Sprout aria-hidden="true" />
                    <strong>
                        Small steps.
                        <br />
                        Big impact.
                    </strong>
                    <p>
                        Share something you learned. Help someone get started.
                    </p>
                    <Link href="/topics/create">
                        Create topic <ArrowRight />
                    </Link>
                </div>
            </aside>
        </>
    );
}
