import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { MethodFields } from '@/components/method-fields';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { MethodSummary, TopicSummary } from '@/types';

type Props = {
    topic: Pick<TopicSummary, 'id' | 'title' | 'slug'>;
    method: Pick<
        MethodSummary,
        'id' | 'title' | 'body' | 'body_document' | 'source_url'
    >;
    revision: string;
};

export default function MethodEdit({ topic, method, revision }: Props) {
    const [initialRevision] = useState(revision);
    const methodUrl = `/topics/${topic.slug}/methods/${method.id}`;
    const returnUrl = `/topics/${topic.slug}#method-${method.id}`;

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
                        Add clearer steps, correct details or update the source.
                        If you tried a different approach, share it as a new
                        method so existing experiences keep their context.
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
                                Experiences and evidence remain attached. The
                                method will show when it was last updated.
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
