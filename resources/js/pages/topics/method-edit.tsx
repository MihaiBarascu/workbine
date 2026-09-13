import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import InputError from '@/components/input-error';
import { RichTextContent } from '@/components/rich-text-content';
import { Label } from '@/components/ui/label';
import { MethodFields } from '@/components/method-fields';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { MethodSummary, TopicSummary } from '@/types';

type Props = {
    topic: Pick<TopicSummary, 'id' | 'title' | 'slug'>;
    method: Pick<
        MethodSummary,
        | 'id'
        | 'title'
        | 'body'
        | 'body_document'
        | 'source_url'
        | 'protected_at'
    >;
    revision: string;
    submissionId: string;
};

function UpdateErrorFocus({
    processing,
    error,
    inputRef,
}: {
    processing: boolean;
    error?: string;
    inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
    useEffect(() => {
        if (processing || !error) return;

        // onError can precede React removing the form's inert attribute.
        // Wait for the committed interactive state, not an arbitrary timeout.
        const frame = requestAnimationFrame(() => inputRef.current?.focus());
        return () => cancelAnimationFrame(frame);
    }, [processing, error, inputRef]);

    return null;
}

export default function MethodEdit({
    topic,
    method,
    revision,
    submissionId,
}: Props) {
    const [initialRevision] = useState(revision);
    const [initiallyProtected] = useState(Boolean(method.protected_at));
    const [updateSubmissionId, setUpdateSubmissionId] = useState(submissionId);
    const updateBodyRef = useRef<HTMLTextAreaElement>(null);
    const methodUrl = `/topics/${topic.slug}/methods/${method.id}`;
    const returnUrl = `/topics/${topic.slug}/methods/${method.id}`;

    if (initiallyProtected) {
        return (
            <PublicShell>
                <Head title={`Add an update - ${method.title}`} />
                <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
                    <Button asChild variant="ghost" className="mb-6 -ml-3">
                        <Link href={returnUrl}>
                            <ArrowLeft aria-hidden="true" />
                            Back to method
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-semibold">Add an update</h1>
                    <p className="text-muted-foreground mt-4 leading-7">
                        Someone has tried this method, so the original
                        explanation, photos and sources are preserved. Add a
                        dated note below. Earlier experiences do not evaluate
                        your update.
                    </p>
                    <p className="mt-3 text-sm">
                        Trying a different approach?{' '}
                        <Link
                            href={`/topics/${topic.slug}/methods/create`}
                            className="text-primary underline underline-offset-4"
                        >
                            Share a new method
                        </Link>
                        .
                    </p>
                    <details className="wb-panel my-6">
                        <summary className="cursor-pointer font-medium">
                            Original method: {method.title}
                        </summary>
                        <div className="mt-4">
                            <RichTextContent
                                document={method.body_document}
                                text={method.body}
                            />
                        </div>
                        {method.source_url && (
                            <p className="mt-3 text-sm break-words">
                                Original source: {method.source_url}
                            </p>
                        )}
                    </details>
                    <Form
                        action={`${methodUrl}/updates`}
                        method="post"
                        disableWhileProcessing
                        className="wb-panel space-y-5"
                    >
                        {({ processing, errors, clearErrors }) => (
                            <>
                                <UpdateErrorFocus
                                    processing={processing}
                                    error={errors.body || errors.submission_id}
                                    inputRef={updateBodyRef}
                                />
                                <input
                                    type="hidden"
                                    name="submission_id"
                                    value={updateSubmissionId}
                                />
                                <div className="space-y-2">
                                    <Label htmlFor="method-update-body">
                                        Your update
                                    </Label>
                                    <textarea
                                        ref={updateBodyRef}
                                        className="border-input focus-visible:ring-ring w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2"
                                        id="method-update-body"
                                        name="body"
                                        required
                                        maxLength={5000}
                                        rows={6}
                                        aria-invalid={Boolean(
                                            errors.body || errors.submission_id,
                                        )}
                                        aria-describedby="update-help update-error update-submission-error"
                                        placeholder="Add a correction, clarification or something you learned later."
                                    />
                                    <p
                                        id="update-help"
                                        className="text-muted-foreground text-sm"
                                    >
                                        This note will be dated and published
                                        separately. Published updates cannot be
                                        rewritten.
                                    </p>
                                    <InputError
                                        id="update-error"
                                        message={errors.body}
                                    />
                                    {errors.submission_id && (
                                        <div role="alert" className="space-y-3">
                                            <InputError
                                                id="update-submission-error"
                                                message={errors.submission_id}
                                            />
                                            <a
                                                href={returnUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-primary block text-sm underline underline-offset-4"
                                            >
                                                View published updates (new tab)
                                            </a>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-auto max-w-full whitespace-normal"
                                                disabled={processing}
                                                onClick={() => {
                                                    setUpdateSubmissionId(
                                                        submissionId,
                                                    );
                                                    clearErrors(
                                                        'submission_id',
                                                    );
                                                    updateBodyRef.current?.focus();
                                                }}
                                            >
                                                Use this draft for a new update
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        type="submit"
                                        disabled={
                                            processing ||
                                            Boolean(errors.submission_id)
                                        }
                                    >
                                        {processing && <Spinner />}Publish
                                        update
                                    </Button>
                                    <Button asChild variant="ghost">
                                        <Link href={returnUrl}>Cancel</Link>
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </main>
            </PublicShell>
        );
    }

    return (
        <PublicShell>
            <Head title={`Edit method - ${method.title}`} />
            <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
                <Button asChild variant="ghost" className="mb-6 -ml-3">
                    <Link href={returnUrl}>
                        <ArrowLeft aria-hidden="true" />
                        Back to method
                    </Link>
                </Button>

                <div className="mb-9">
                    <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                        Edit your method
                    </h1>
                    <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-7">
                        Topic:{' '}
                        <span className="text-foreground font-medium">
                            {topic.title}
                        </span>
                    </p>
                    <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
                        You can edit this method until another member shares an
                        experience. After that, the original stays preserved and
                        you can add dated updates.
                    </p>
                </div>

                <Form
                    action={methodUrl}
                    method="patch"
                    disableWhileProcessing
                    className="wb-panel space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <input
                                type="hidden"
                                name="revision"
                                value={initialRevision}
                            />
                            {errors.revision && (
                                <div role="alert" className="space-y-2">
                                    <InputError message={errors.revision} />
                                    <a
                                        href={`${methodUrl}/edit`}
                                        className="text-primary text-sm underline underline-offset-4"
                                    >
                                        Reload the latest version
                                    </a>
                                </div>
                            )}
                            <MethodFields
                                errors={errors}
                                initialValues={method}
                                autoFocus
                            />
                            <p className="text-muted-foreground text-sm leading-6">
                                Once someone has tried this method, you can add
                                updates but cannot rewrite the original.
                            </p>
                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Save changes
                                </Button>
                                <Button asChild variant="ghost" size="lg">
                                    <Link href={returnUrl}>Cancel</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </main>
        </PublicShell>
    );
}
