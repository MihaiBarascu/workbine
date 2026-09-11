import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { MethodFields } from '@/components/method-fields';
import InputError from '@/components/input-error';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type Props = { initialTitle: string };

export default function TopicCreate({ initialTitle }: Props) {
    const [includeMethod, setIncludeMethod] = useState(false);

    return (
        <PublicShell>
            <Head title="Start a topic" />

            <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
                <Button asChild variant="ghost" className="mb-6 -ml-3">
                    <Link href="/topics">
                        <ArrowLeft />
                        Back to topics
                    </Link>
                </Button>

                <div className="mb-9">
                    <div className="bg-muted text-muted-foreground mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium">
                        <MessageSquare className="size-4" />
                        Start something useful
                    </div>
                    <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                        Start a topic. Share your approach if you have one.
                    </h1>
                    <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-7">
                        Publish your own method with the topic, or open a
                        subject you want to explore. Others can contribute their
                        approaches and experiences in either case.
                    </p>
                </div>

                <Form
                    action="/topics"
                    method="post"
                    disableWhileProcessing
                    className="wb-panel space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="title">Topic</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    defaultValue={initialTitle}
                                    required
                                    autoFocus
                                    maxLength={160}
                                    placeholder="Automating product imports for an online store"
                                />
                                <p className="text-muted-foreground text-sm">
                                    Name the subject or outcome. A question
                                    works too.
                                </p>
                                <InputError message={errors.title} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Context</Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={4}
                                    maxLength={5000}
                                    placeholder="Describe the situation, the goal and any constraints that help people understand the topic."
                                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive min-h-32 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <InputError message={errors.description} />
                            </div>

                            <section
                                className="space-y-5 border-t pt-6"
                                aria-labelledby="first-method-heading"
                            >
                                <div className="flex items-start gap-3">
                                    <input
                                        id="include_method"
                                        name="include_method"
                                        type="checkbox"
                                        value="1"
                                        checked={includeMethod}
                                        onChange={(event) =>
                                            setIncludeMethod(
                                                event.target.checked,
                                            )
                                        }
                                        aria-controls="first-method-fields"
                                        aria-describedby="first-method-hint"
                                        className="accent-primary mt-1 size-4 shrink-0"
                                    />
                                    <div className="space-y-2">
                                        <Label
                                            id="first-method-heading"
                                            htmlFor="include_method"
                                        >
                                            Add my method too
                                        </Label>
                                        <p
                                            id="first-method-hint"
                                            className="text-muted-foreground text-sm leading-6"
                                        >
                                            Have an approach to share? Publish
                                            it with your topic. You can also
                                            start with just the topic and add a
                                            method later.
                                        </p>
                                    </div>
                                </div>
                                <InputError message={errors.include_method} />
                                <fieldset
                                    id="first-method-fields"
                                    hidden={!includeMethod}
                                    disabled={!includeMethod}
                                    className="space-y-6"
                                >
                                    <legend className="sr-only">
                                        Your first method
                                    </legend>
                                    <MethodFields
                                        errors={errors}
                                        prefix="method_"
                                    />
                                </fieldset>
                            </section>

                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    {includeMethod
                                        ? 'Publish topic & method'
                                        : 'Publish topic'}
                                </Button>
                                <Button asChild variant="ghost" size="lg">
                                    <Link href="/topics">Cancel</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </main>
        </PublicShell>
    );
}
