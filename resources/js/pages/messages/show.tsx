import { Form, Head, Link, useForm, usePoll } from '@inertiajs/react';
import { ArrowLeft, Ban, MessageCircle } from 'lucide-react';
import { useEffect, useRef, type FormEvent } from 'react';
import { MemberAvatar } from '@/components/community';
import InputError from '@/components/input-error';
import { PublicShell } from '@/components/public-shell';
import { ReportLink } from '@/components/report-link';
import { Button } from '@/components/ui/button';

type Member = {
    id: number;
    name: string;
    username: string;
    avatar_url: string | null;
};

type Message = {
    id: number;
    body: string | null;
    removed: boolean;
    mine: boolean;
    created_at: string | null;
    context: {
        id: number;
        type: 'method' | 'experience';
        title: string;
        url: string;
    } | null;
};

type Props = {
    conversation: {
        id: number;
        member: Member;
        messaging_blocked: boolean;
        blocked_by_me: boolean;
    };
    messages: Message[];
    hasOlderMessages: boolean;
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

export default function MessageShow({ conversation, messages, hasOlderMessages }: Props) {
    const form = useForm({ body: '' });
    const endRef = useRef<HTMLDivElement>(null);

    usePoll(
        5000,
        { only: ['conversation', 'messages', 'hasOlderMessages', 'unreadMessages'] },
        { mode: 'rest' },
    );

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'end' });
    }, [messages.at(-1)?.id]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(`/messages/${conversation.id}`, {
            preserveScroll: true,
            onSuccess: () => form.reset('body'),
        });
    };

    return (
        <PublicShell>
            <Head title={`Messages with ${conversation.member.name}`} />
            <main className="wb-page mx-auto flex w-full max-w-4xl flex-col px-4 py-6 sm:px-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <Link href="/messages" className="text-muted-foreground hover:text-foreground inline-flex min-h-10 items-center gap-2 text-sm font-medium">
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Messages
                    </Link>
                    <div className="flex items-center gap-2">
                        {conversation.blocked_by_me ? (
                            <Form action={`/members/${conversation.member.username}/block`} method="delete" disableWhileProcessing>
                                {({ processing }) => (
                                    <Button type="submit" size="sm" variant="outline" disabled={processing}>Unblock</Button>
                                )}
                            </Form>
                        ) : (
                            <Form action={`/members/${conversation.member.username}/block`} method="post" disableWhileProcessing>
                                {({ processing }) => (
                                    <Button
                                        type="submit"
                                        size="sm"
                                        variant="ghost"
                                        disabled={processing}
                                        onClick={(event) => {
                                            if (!window.confirm(`Block ${conversation.member.name}? Neither of you will be able to send messages until you unblock them.`)) {
                                                event.preventDefault();
                                            }
                                        }}
                                    >
                                        <Ban aria-hidden="true" />
                                        Block
                                    </Button>
                                )}
                            </Form>
                        )}
                    </div>
                </div>

                <section className="bg-card flex min-h-[65vh] flex-col overflow-hidden rounded-2xl border" aria-labelledby="conversation-heading">
                    <header className="flex items-center gap-3 border-b p-4 sm:p-5">
                        <MemberAvatar name={conversation.member.name} src={conversation.member.avatar_url} />
                        <div className="min-w-0">
                            <h1 id="conversation-heading" className="truncate font-semibold">
                                <Link href={`/members/${conversation.member.username}`} className="hover:text-primary">{conversation.member.name}</Link>
                            </h1>
                            <p className="text-muted-foreground truncate text-xs">@{conversation.member.username}</p>
                        </div>
                    </header>

                    <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
                        {hasOlderMessages && (
                            <p className="text-muted-foreground mx-auto max-w-md text-center text-xs leading-5">
                                Showing the latest 100 messages. Earlier messages are kept in the conversation history but are not loaded on this screen.
                            </p>
                        )}
                        {messages.map((message) => (
                            <article
                                key={message.id}
                                id={`message-${message.id}`}
                                className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] sm:max-w-[72%] ${message.mine ? 'text-right' : ''}`}>
                                    {message.context && !message.removed && (
                                        <Link
                                            href={message.context.url}
                                            className="bg-muted/60 hover:bg-muted mb-2 block rounded-lg border px-3 py-2 text-left text-xs transition-colors"
                                        >
                                            <span className="text-muted-foreground block font-medium">
                                                {message.context.type === 'method' ? 'Method' : 'Experience'}
                                            </span>
                                            <span className="text-foreground mt-0.5 block font-semibold">{message.context.title}</span>
                                        </Link>
                                    )}
                                    <div className={`rounded-2xl px-4 py-3 text-left text-sm leading-6 ${message.mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                        {message.removed ? (
                                            <span className="italic opacity-75">Message removed by moderation.</span>
                                        ) : (
                                            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.body}</p>
                                        )}
                                    </div>
                                    <div className={`mt-1 flex items-center gap-1 ${message.mine ? 'justify-end' : 'justify-start'}`}>
                                        <time className="text-muted-foreground px-1 text-[11px]" dateTime={message.created_at ?? undefined}>
                                            {formatTime(message.created_at)}
                                        </time>
                                        {!message.mine && !message.removed && <ReportLink type="message" id={message.id} />}
                                    </div>
                                </div>
                            </article>
                        ))}
                        <div ref={endRef} />
                    </div>

                    <footer className="border-t p-4 sm:p-5">
                        {conversation.messaging_blocked ? (
                            <div className="rounded-xl border p-4 text-sm">
                                <p className="font-semibold">Messaging is paused</p>
                                <p className="text-muted-foreground mt-1">
                                    {conversation.blocked_by_me
                                        ? 'You blocked this member. Unblock them to continue the conversation.'
                                        : 'You cannot send messages in this conversation right now.'}
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={submit} className="space-y-2">
                                <label htmlFor="reply-body" className="sr-only">Message</label>
                                <textarea
                                    id="reply-body"
                                    value={form.data.body}
                                    onChange={(event) => form.setData('body', event.target.value)}
                                    rows={3}
                                    maxLength={4000}
                                    required
                                    className="border-input bg-background focus-visible:ring-ring w-full resize-none rounded-xl border px-3 py-3 text-sm outline-none focus-visible:ring-2"
                                    placeholder={`Message ${conversation.member.name}`}
                                />
                                <div className="flex items-center justify-between gap-3">
                                    <InputError message={form.errors.body} />
                                    <Button type="submit" size="sm" disabled={form.processing || !form.data.body.trim()} className="ml-auto">
                                        <MessageCircle aria-hidden="true" />
                                        Send
                                    </Button>
                                </div>
                            </form>
                        )}
                    </footer>
                </section>
            </main>
        </PublicShell>
    );
}
