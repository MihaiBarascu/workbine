import { Head, Link } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';
import { MemberAvatar } from '@/components/community';
import { PublicShell } from '@/components/public-shell';

type Member = {
    id: number;
    name: string;
    username: string;
    avatar_url: string | null;
};

type Conversation = {
    id: number;
    member: Member;
    latest_message: {
        body: string;
        mine: boolean;
        created_at: string | null;
    } | null;
    unread_count: number;
};

type Props = {
    conversations: {
        data: Conversation[];
        current_page: number;
        last_page: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
};

function formatTime(value: string | null): string {
    if (!value) return '';
    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}

export default function MessageIndex({ conversations }: Props) {
    return (
        <PublicShell>
            <Head title="Messages" />
            <main className="wb-page mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
                <div className="mb-6">
                    <p className="wb-kicker">Private conversations</p>
                    <h1 className="text-3xl font-semibold tracking-tight">Messages</h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl">
                        Continue a conversation that started from a member, method,
                        or real experience.
                    </p>
                </div>

                {conversations.data.length === 0 ? (
                    <section className="bg-card rounded-2xl border p-8 text-center">
                        <MessageCircle className="text-muted-foreground mx-auto size-9" aria-hidden="true" />
                        <h2 className="mt-4 text-lg font-semibold">No conversations yet</h2>
                        <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm leading-6">
                            When someone’s contribution gives you a reason to talk,
                            you can message them from their profile, method, or experience.
                        </p>
                        <Link href="/topics" className="text-primary mt-5 inline-flex min-h-10 items-center font-medium">
                            Explore the community →
                        </Link>
                    </section>
                ) : (
                    <section className="bg-card overflow-hidden rounded-2xl border" aria-label="Conversations">
                        {conversations.data.map((conversation) => (
                            <Link
                                key={conversation.id}
                                href={`/messages/${conversation.id}`}
                                className="hover:bg-muted/60 focus-visible:ring-ring flex gap-4 border-b p-4 transition-colors last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset sm:p-5"
                            >
                                <MemberAvatar name={conversation.member.name} src={conversation.member.avatar_url} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold">{conversation.member.name}</p>
                                            <p className="text-muted-foreground truncate text-xs">@{conversation.member.username}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            {conversation.unread_count > 0 && (
                                                <span className="bg-primary text-primary-foreground inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold" aria-label={`${conversation.unread_count} unread messages`}>
                                                    {conversation.unread_count}
                                                </span>
                                            )}
                                            <time className="text-muted-foreground text-xs" dateTime={conversation.latest_message?.created_at ?? undefined}>
                                                {formatTime(conversation.latest_message?.created_at ?? null)}
                                            </time>
                                        </div>
                                    </div>
                                    {conversation.latest_message && (
                                        <p className="text-muted-foreground mt-2 truncate text-sm">
                                            {conversation.latest_message.mine ? 'You: ' : ''}
                                            {conversation.latest_message.body}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </section>
                )}

                {conversations.last_page > 1 && (
                    <nav className="mt-6 flex items-center justify-between gap-4 text-sm" aria-label="Conversation pagination">
                        {conversations.prev_page_url ? (
                            <Link href={conversations.prev_page_url} className="text-primary min-h-10 py-2 font-medium">← Previous</Link>
                        ) : <span />}
                        <span className="text-muted-foreground">Page {conversations.current_page} of {conversations.last_page}</span>
                        {conversations.next_page_url ? (
                            <Link href={conversations.next_page_url} className="text-primary min-h-10 py-2 font-medium">Next →</Link>
                        ) : <span />}
                    </nav>
                )}
            </main>
        </PublicShell>
    );
}
