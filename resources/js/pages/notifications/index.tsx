import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, Bell, CheckCheck } from 'lucide-react';
import { MemberAvatar } from '@/components/community';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';

type Notification = {
    id: number;
    actor: { name: string; username: string; avatar_url: string | null };
    title: string;
    kind: 'method' | 'response';
    read: boolean;
    created_at: string;
};
type Props = {
    notifications: {
        data: Notification[];
        current_page: number;
        last_page: number;
        prev_page_url: string | null;
        next_page_url: string | null;
        total: number;
    };
};

export default function Notifications({ notifications }: Props) {
    const form = useForm({});
    return (
        <PublicShell>
            <Head title="Notifications" />
            <main className="wb-notification-page mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
                <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-semibold">
                            Notifications
                        </h1>
                        <p className="text-muted-foreground mt-2 leading-6">
                            New methods on your topics and responses to your
                            methods.
                        </p>
                    </div>
                    {notifications.total > 0 && (
                        <Button
                            variant="outline"
                            disabled={form.processing}
                            onClick={() =>
                                form.post('/notifications/read', {
                                    preserveScroll: true,
                                })
                            }
                        >
                            <CheckCheck aria-hidden="true" />
                            Mark all as read
                        </Button>
                    )}
                </header>
                {notifications.data.length ? (
                    <ul className="wb-notification-list">
                        {notifications.data.map((item) => (
                            <li key={item.id}>
                                <Link
                                    href={`/notifications/${item.id}/open`}
                                    method="post"
                                    as="button"
                                    className={`wb-notification-item ${item.read ? '' : 'wb-notification-unread'}`}
                                >
                                    <MemberAvatar
                                        name={item.actor.name}
                                        src={item.actor.avatar_url}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block leading-6">
                                            <strong>{item.actor.name}</strong>{' '}
                                            {item.kind === 'method'
                                                ? 'shared a method on your topic'
                                                : 'shared what happened after trying your method'}
                                        </span>
                                        <span className="mt-1 block font-semibold [overflow-wrap:anywhere]">
                                            {item.title}
                                        </span>
                                        <span className="text-muted-foreground mt-2 block text-xs">
                                            {!item.read && (
                                                <span className="text-primary mr-2 font-semibold">
                                                    Unread
                                                </span>
                                            )}
                                            <time dateTime={item.created_at}>
                                                {new Intl.DateTimeFormat('en', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    timeZone: 'UTC',
                                                }).format(
                                                    new Date(item.created_at),
                                                )}
                                            </time>
                                        </span>
                                    </span>
                                    <ArrowRight
                                        aria-hidden="true"
                                        className="mt-1 size-4 shrink-0"
                                    />
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="wb-empty">
                        <Bell aria-hidden="true" className="wb-empty-icon" />
                        <h2>You’re all caught up</h2>
                        <p>
                            When someone shares a method on your topic or tells
                            you how your method worked for them, you’ll find it
                            here.
                        </p>
                        <Button asChild>
                            <Link href="/topics">
                                Explore the community{' '}
                                <ArrowRight aria-hidden="true" />
                            </Link>
                        </Button>
                    </div>
                )}
                {notifications.last_page > 1 && (
                    <nav
                        aria-label="Notification pagination"
                        className="wb-pagination"
                    >
                        {notifications.prev_page_url ? (
                            <Button asChild variant="outline">
                                <Link href={notifications.prev_page_url}>
                                    Previous
                                </Link>
                            </Button>
                        ) : (
                            <Button variant="outline" disabled>
                                Previous
                            </Button>
                        )}
                        <span>
                            Page {notifications.current_page} of{' '}
                            {notifications.last_page}
                        </span>
                        {notifications.next_page_url ? (
                            <Button asChild variant="outline">
                                <Link href={notifications.next_page_url}>
                                    Next
                                </Link>
                            </Button>
                        ) : (
                            <Button variant="outline" disabled>
                                Next
                            </Button>
                        )}
                    </nav>
                )}
            </main>
        </PublicShell>
    );
}
