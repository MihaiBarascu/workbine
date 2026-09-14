import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import type { FormEvent } from 'react';
import { MemberAvatar } from '@/components/community';
import InputError from '@/components/input-error';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';

type Member = {
    id: number;
    name: string;
    username: string;
    avatar_url: string | null;
};

type Context = {
    id: number;
    type: 'method' | 'experience';
    title: string;
    url: string;
};

type Props = {
    recipient: Member;
    context: Context | null;
    conversationId: number | null;
    messaging_blocked: boolean;
    blocked_by_me: boolean;
};

export default function MessageCreate({
    recipient,
    context,
    conversationId,
    messaging_blocked,
    blocked_by_me,
}: Props) {
    const form = useForm({
        body: '',
        context_type: context?.type ?? '',
        context_id: context?.id ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(`/members/${recipient.username}/message`);
    };

    return (
        <PublicShell>
            <Head title={`Message ${recipient.name}`} />
            <main className="wb-page mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
                <Link href={`/members/${recipient.username}`} className="text-muted-foreground hover:text-foreground inline-flex min-h-10 items-center gap-2 text-sm font-medium">
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back to profile
                </Link>

                <section className="bg-card mt-4 rounded-2xl border p-5 sm:p-7">
                    <div className="flex items-center gap-3">
                        <MemberAvatar name={recipient.name} src={recipient.avatar_url} large />
                        <div className="min-w-0">
                            <p className="wb-kicker">Private message</p>
                            <h1 className="truncate text-2xl font-semibold">{recipient.name}</h1>
                            <p className="text-muted-foreground text-sm">@{recipient.username}</p>
                        </div>
                    </div>

                    {context && (
                        <div className="bg-muted/50 mt-6 rounded-xl border p-4">
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                                {context.type === 'method' ? 'About this method' : 'About this experience'}
                            </p>
                            <Link href={context.url} className="text-primary mt-1 inline-flex font-medium">
                                {context.title}
                            </Link>
                        </div>
                    )}

                    {conversationId && (
                        <p className="text-muted-foreground mt-5 text-sm">
                            You already have a conversation with this member. This message will continue it.{' '}
                            <Link href={`/messages/${conversationId}`} className="text-primary font-medium">Open conversation</Link>
                        </p>
                    )}

                    {messaging_blocked ? (
                        <div className="mt-6 rounded-xl border p-5">
                            <h2 className="font-semibold">Messaging is unavailable</h2>
                            <p className="text-muted-foreground mt-2 text-sm leading-6">
                                {blocked_by_me
                                    ? 'You blocked this member. Unblock them from the existing conversation if you want to message again.'
                                    : 'You cannot send a message to this member right now.'}
                            </p>
                            {conversationId && (
                                <Button asChild variant="outline" className="mt-4">
                                    <Link href={`/messages/${conversationId}`}>Open conversation</Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={submit} className="mt-6 space-y-3">
                            <label htmlFor="message-body" className="font-medium">Message</label>
                            <textarea
                                id="message-body"
                                value={form.data.body}
                                onChange={(event) => form.setData('body', event.target.value)}
                                rows={7}
                                maxLength={4000}
                                required
                                autoFocus
                                className="border-input bg-background focus-visible:ring-ring w-full resize-y rounded-xl border px-3 py-3 text-sm outline-none focus-visible:ring-2"
                                placeholder="Say why you’re reaching out. A useful context makes the conversation easier to start."
                            />
                            <div className="flex items-center justify-between gap-4">
                                <InputError message={form.errors.body} />
                                <span className="text-muted-foreground ml-auto text-xs">{form.data.body.length}/4000</span>
                            </div>
                            <Button type="submit" disabled={form.processing || !form.data.body.trim()}>
                                <MessageCircle aria-hidden="true" />
                                Send message
                            </Button>
                        </form>
                    )}
                </section>
            </main>
        </PublicShell>
    );
}
