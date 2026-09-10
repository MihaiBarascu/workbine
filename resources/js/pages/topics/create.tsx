import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import InputError from '@/components/input-error';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function TopicCreate() {
    return (
        <PublicShell>
            <Head title="Start a topic" />

            <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
                <Button asChild variant="ghost" className="mb-6 -ml-3">
                    <Link href="/topics">
                        <ArrowLeft />
                        Back to topics
                    </Link>
                </Button>

                <div className="mb-9">
                    <div className="bg-muted text-muted-foreground mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium">
                        <Sparkles className="size-4" />
                        Start something useful
                    </div>
                    <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                        What should people share real methods about?
                    </h1>
                    <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-7">
                        Make the topic specific enough that someone can say, “I
                        actually did this — here is what worked for me.”
                    </p>
                </div>

                <Form
                    action="/topics"
                    method="post"
                    disableWhileProcessing
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="title">Topic</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    required
                                    autoFocus
                                    maxLength={160}
                                    placeholder="How do you build a useful SaaS with Gemini?"
                                />
                                <p className="text-muted-foreground text-sm">
                                    A clear question or outcome works best.
                                </p>
                                <InputError message={errors.title} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Context</Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={7}
                                    maxLength={5000}
                                    placeholder="What context, constraints or details would make the answers genuinely useful?"
                                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive min-h-32 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <InputError message={errors.description} />
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Publish topic
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
