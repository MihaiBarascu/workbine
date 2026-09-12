import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type Props = {
    kind: 'review' | 'report';
    item: {
        id: number;
        status: string;
        text: Record<string, string | null>;
        image: string | null;
        reasons: string[];
        hidden: boolean;
        details: string | null;
        note: string | null;
        author: { username: string; suspended: boolean } | null;
    };
};

export default function ModerationShow({ kind, item }: Props) {
    const [showImage, setShowImage] = useState(false);
    const form = useForm({ action: '', note: '', publishing: 'unchanged' });
    const actions =
        kind === 'review'
            ? [
                  { value: 'approve', label: 'Approve for resubmission' },
                  { value: 'reject', label: 'Reject submission' },
              ]
            : [
                  { value: 'hide', label: 'Hide content' },
                  { value: 'dismiss', label: 'Dismiss report' },
                  ...(item.hidden
                      ? [{ value: 'restore', label: 'Restore content' }]
                      : []),
              ];

    return (
        <PublicShell>
            <Head title={`Review #${item.id}`}>
                <meta name="robots" content="noindex, nofollow" />
                <meta name="referrer" content="no-referrer" />
            </Head>
            <main className="wb-notebook">
                <Link
                    href={`/moderation?kind=${kind}`}
                    className="text-sm underline"
                >
                    Back to moderation
                </Link>
                <header className="wb-notebook-masthead mt-6">
                    <div>
                        <h1>
                            {kind === 'review'
                                ? 'Held submission'
                                : 'Community report'}{' '}
                            #{item.id}
                        </h1>
                        <p>
                            Status: {item.status}.{' '}
                            {item.author
                                ? `Author: @${item.author.username}.`
                                : 'The original content or account was removed.'}
                        </p>
                    </div>
                </header>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
                    <section
                        aria-label="Submitted content"
                        className="bg-background min-w-0 rounded-lg border p-5 sm:p-6"
                    >
                        <h2 className="font-semibold">Content to review</h2>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Reason: {item.reasons.join(', ')}
                        </p>
                        {item.details && (
                            <p className="my-4 [overflow-wrap:anywhere] whitespace-pre-wrap">
                                Report details: {item.details}
                            </p>
                        )}
                        <dl className="mt-5 space-y-5">
                            {Object.entries(item.text)
                                .filter(([, value]) => value)
                                .map(([key, value]) => (
                                    <div key={key}>
                                        <dt className="mb-1 text-sm font-medium capitalize">
                                            {key.replaceAll('_', ' ')}
                                        </dt>
                                        <dd className="[overflow-wrap:anywhere] whitespace-pre-wrap">
                                            {value}
                                        </dd>
                                    </div>
                                ))}
                        </dl>
                        {item.image && (
                            <div className="mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowImage(!showImage)}
                                >
                                    {showImage
                                        ? 'Hide image'
                                        : 'Show image for review'}
                                </Button>
                                {showImage && (
                                    <img
                                        src={item.image}
                                        alt="Submitted image awaiting a moderation decision"
                                        referrerPolicy="no-referrer"
                                        className="mt-4 max-h-[560px] max-w-full rounded-md object-contain"
                                    />
                                )}
                            </div>
                        )}
                    </section>
                    <section
                        aria-label="Review decision"
                        className="bg-background self-start rounded-lg border p-5 sm:p-6"
                    >
                        <h2 className="font-semibold">Your decision</h2>
                        <p className="text-muted-foreground mt-2 text-sm">
                            {kind === 'review'
                                ? 'Approval lets the author resubmit this exact content. It does not publish it automatically.'
                                : 'Hiding a topic or method also hides its dependent contributions. Existing image links may still work until the image and cache are removed.'}
                        </p>
                        {item.note && (
                            <p className="mt-4 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
                                Previous note: {item.note}
                            </p>
                        )}
                        <form
                            className="mt-5 space-y-5"
                            onSubmit={(event) => {
                                event.preventDefault();
                                form.post(`/moderation/${kind}/${item.id}`, {
                                    preserveScroll: true,
                                    onSuccess: () => form.reset(),
                                });
                            }}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="decision">Decision</Label>
                                <select
                                    id="decision"
                                    required
                                    value={form.data.action}
                                    onChange={(event) =>
                                        form.setData(
                                            'action',
                                            event.target.value,
                                        )
                                    }
                                    className="bg-background h-10 w-full rounded-md border px-3 text-sm"
                                >
                                    <option value="">Choose a decision</option>
                                    {actions.map((action) => (
                                        <option
                                            key={action.value}
                                            value={action.value}
                                        >
                                            {action.label}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.action} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="review-note">
                                    Reason for your decision
                                </Label>
                                <textarea
                                    className="bg-background min-h-28 w-full rounded-md border p-3 text-sm"
                                    id="review-note"
                                    required
                                    minLength={3}
                                    maxLength={2000}
                                    value={form.data.note}
                                    onChange={(event) =>
                                        form.setData('note', event.target.value)
                                    }
                                />
                                <InputError message={form.errors.note} />
                            </div>
                            {item.author && (
                                <div className="space-y-2">
                                    <Label htmlFor="publishing">
                                        Author publishing access
                                    </Label>
                                    <p className="text-muted-foreground text-sm">
                                        Currently{' '}
                                        {item.author.suspended
                                            ? 'suspended'
                                            : 'allowed'}
                                        . Suspend only for serious or repeated
                                        abuse.
                                    </p>
                                    <select
                                        id="publishing"
                                        value={form.data.publishing}
                                        onChange={(event) =>
                                            form.setData(
                                                'publishing',
                                                event.target.value,
                                            )
                                        }
                                        className="bg-background h-10 w-full rounded-md border px-3 text-sm"
                                    >
                                        <option value="unchanged">
                                            Leave unchanged
                                        </option>
                                        <option
                                            value={
                                                item.author.suspended
                                                    ? 'restore'
                                                    : 'suspend'
                                            }
                                        >
                                            {item.author.suspended
                                                ? 'Restore publishing'
                                                : 'Suspend publishing'}
                                        </option>
                                    </select>
                                    <InputError
                                        message={form.errors.publishing}
                                    />
                                </div>
                            )}
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving…' : 'Save decision'}
                            </Button>
                        </form>
                    </section>
                </div>
            </main>
        </PublicShell>
    );
}
