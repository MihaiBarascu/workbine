import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { TopicSummary } from '@/types';

type Props = {
    topic: Pick<TopicSummary, 'id' | 'title' | 'slug' | 'description'>;
    revision: string;
};

export default function TopicEdit({ topic, revision }: Props) {
    const [initialRevision] = useState(revision);
    const topicUrl = `/topics/${topic.slug}`;

    return (
        <PublicShell>
            <Head title={`Edit topic - ${topic.title}`} />
            <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
                <Button asChild variant="ghost" className="mb-6 -ml-3">
                    <Link href={topicUrl}>
                        <ArrowLeft aria-hidden="true" />
                        Back to topic
                    </Link>
                </Button>

                <div className="mb-9">
                    <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                        Edit your topic
                    </h1>
                    <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-7">
                        Clarify the subject and context so people can contribute
                        useful approaches. Keep the same subject when others
                        have already shared methods.
                    </p>
                </div>

                <Form
                    action={topicUrl}
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
                                        href={`${topicUrl}/edit`}
                                        className="text-primary text-sm underline underline-offset-4"
                                    >
                                        Reload the latest version
                                    </a>
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label htmlFor="title">Topic</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    defaultValue={topic.title}
                                    required
                                    autoFocus
                                    maxLength={160}
                                    aria-invalid={Boolean(errors.title)}
                                    aria-describedby={
                                        errors.title ? 'title-error' : undefined
                                    }
                                />
                                <InputError
                                    id="title-error"
                                    message={errors.title}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">
                                    Context{' '}
                                    <span className="text-muted-foreground font-normal">
                                        (optional)
                                    </span>
                                </Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    defaultValue={topic.description ?? ''}
                                    rows={5}
                                    maxLength={5000}
                                    aria-invalid={Boolean(errors.description)}
                                    aria-describedby={
                                        errors.description
                                            ? 'description-error'
                                            : undefined
                                    }
                                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive min-h-32 w-full rounded-md border px-3 py-2 text-sm leading-6 shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <InputError
                                    id="description-error"
                                    message={errors.description}
                                />
                            </div>
                            <p className="text-muted-foreground text-sm leading-6">
                                The topic link stays the same. Existing methods
                                and experiences remain attached.
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
                                    <Link href={topicUrl}>Cancel</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </main>
        </PublicShell>
    );
}
