import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, Globe, PenLine } from 'lucide-react';
import { useState } from 'react';
import { FormErrorSummary } from '@/components/form-error-summary';
import InputError from '@/components/input-error';
import { MethodFields } from '@/components/method-fields';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type Props = { initialTitle: string };

const fieldLabels = {
    title: 'Topic title',
    description: 'A little context',
    include_method: 'Add my method too',
    method_title: 'Method title',
    method_body: 'How you do it',
    method_source_url: 'Source link',
};

export default function TopicCreate({ initialTitle }: Props) {
    const [includeMethod, setIncludeMethod] = useState(false);
    const [errorAttempt, setErrorAttempt] = useState(0);

    return (
        <PublicShell>
            <Head title="Start a topic" />
            <main className="wb-topic-composer mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
                <Button asChild variant="ghost" className="mb-5 -ml-3">
                    <Link href="/topics">
                        <ArrowLeft aria-hidden="true" />
                        Back to topics
                    </Link>
                </Button>

                <header className="mb-7">
                    <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                        Start a topic
                    </h1>
                    <p className="text-muted-foreground mt-3 text-base leading-7">
                        Share something you do, or explore how others do it. A
                        title is enough to get started.
                    </p>
                </header>

                <Form
                    action="/topics"
                    method="post"
                    disableWhileProcessing
                    onError={() => setErrorAttempt((attempt) => attempt + 1)}
                    className="wb-panel space-y-6"
                >
                    {({ processing, errors, clearErrors }) => (
                        <>
                            <FormErrorSummary
                                errors={errors}
                                fields={fieldLabels}
                                focusKey={errorAttempt}
                            />
                            <div className="grid gap-2">
                                <Label htmlFor="title">Topic</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    defaultValue={initialTitle}
                                    required
                                    autoFocus
                                    maxLength={160}
                                    aria-invalid={Boolean(errors.title)}
                                    aria-describedby={
                                        errors.title
                                            ? 'title-hint title-error'
                                            : 'title-hint'
                                    }
                                    placeholder="For example: Making time to learn after work"
                                />
                                <p
                                    id="title-hint"
                                    className="text-muted-foreground text-sm"
                                >
                                    Name something you do or want to figure out.
                                    It doesn’t have to be a question.
                                </p>
                                <InputError
                                    id="title-error"
                                    message={errors.title}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">
                                    A little context{' '}
                                    <span className="text-muted-foreground font-normal">
                                        (optional)
                                    </span>
                                </Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={3}
                                    maxLength={5000}
                                    aria-invalid={Boolean(errors.description)}
                                    aria-describedby={
                                        errors.description
                                            ? 'description-hint description-error'
                                            : 'description-hint'
                                    }
                                    placeholder="What would help someone understand your situation?"
                                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive min-h-24 w-full rounded-md border px-3 py-2 text-sm leading-6 shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <p
                                    id="description-hint"
                                    className="text-muted-foreground text-sm"
                                >
                                    Your situation, what you’ve tried, or what
                                    you’re hoping to do. A sentence or two is
                                    fine.
                                </p>
                                <InputError
                                    id="description-error"
                                    message={errors.description}
                                />
                            </div>

                            <section
                                className="space-y-5"
                                aria-labelledby="first-method-heading"
                            >
                                <label
                                    className="wb-method-choice"
                                    data-selected={includeMethod}
                                >
                                    <input
                                        id="include_method"
                                        name="include_method"
                                        type="checkbox"
                                        value="1"
                                        checked={includeMethod}
                                        onChange={(event) => {
                                            setIncludeMethod(
                                                event.target.checked,
                                            );
                                            if (!event.target.checked) {
                                                clearErrors(
                                                    'method_title',
                                                    'method_body',
                                                    'method_source_url',
                                                );
                                            }
                                        }}
                                        aria-labelledby="first-method-heading"
                                        aria-controls="first-method-fields"
                                        aria-describedby={
                                            errors.include_method
                                                ? 'first-method-hint include-method-error'
                                                : 'first-method-hint'
                                        }
                                        aria-invalid={Boolean(
                                            errors.include_method,
                                        )}
                                    />
                                    <span>
                                        <span className="wb-method-choice-title">
                                            <PenLine aria-hidden="true" />
                                            <span id="first-method-heading">
                                                Add my method too
                                            </span>
                                            <span className="wb-optional">
                                                Optional
                                            </span>
                                        </span>
                                        <span
                                            id="first-method-hint"
                                            className="wb-method-choice-hint"
                                        >
                                            Have a way that works for you? Share
                                            your steps along with the topic.
                                        </span>
                                    </span>
                                </label>
                                <InputError
                                    id="include-method-error"
                                    message={errors.include_method}
                                />
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

                            <div className="wb-publish-area">
                                <p
                                    className="wb-publish-next"
                                    aria-live="polite"
                                >
                                    {includeMethod
                                        ? 'Your topic and method will be published together.'
                                        : 'Others can share their methods. You can add yours later, too.'}
                                </p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <Button
                                        type="submit"
                                        size="lg"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        {processing
                                            ? 'Publishing…'
                                            : includeMethod
                                              ? 'Publish topic & method'
                                              : 'Publish topic'}
                                    </Button>
                                    <Button asChild variant="ghost" size="lg">
                                        <Link href="/topics">Cancel</Link>
                                    </Button>
                                </div>
                                <p className="wb-public-note">
                                    <Globe aria-hidden="true" />
                                    <span>
                                        Topics are public. Leave out private
                                        information. You can edit your topic
                                        later.
                                    </span>
                                </p>
                            </div>
                        </>
                    )}
                </Form>
            </main>
        </PublicShell>
    );
}
