import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, Lightbulb } from 'lucide-react';
import { MethodFields } from '@/components/method-fields';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    topic: {
        id: number;
        title: string;
        slug: string;
    };
};

export default function MethodCreate({ topic }: Props) {
    return (
        <PublicShell>
            <Head title={`Share what worked - ${topic.title}`} />

            <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
                <Button asChild variant="ghost" className="mb-6 -ml-3">
                    <Link href={`/topics/${topic.slug}`}>
                        <ArrowLeft />
                        Back to topic
                    </Link>
                </Button>

                <div className="mb-9">
                    <div className="bg-muted text-muted-foreground mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium">
                        <Lightbulb className="size-4" />
                        Share what worked
                    </div>
                    <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                        How did you actually do it?
                    </h1>
                    <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-7">
                        Topic:{' '}
                        <span className="text-foreground font-medium">
                            {topic.title}
                        </span>
                    </p>
                    <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
                        Explain the method as you would to a friend who wants to
                        try the same thing. Specific steps and context are more
                        useful than generic advice.
                    </p>
                </div>

                <Form
                    action={`/topics/${topic.slug}/methods`}
                    method="post"
                    disableWhileProcessing
                    className="wb-panel space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <MethodFields errors={errors} autoFocus />

                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Share method
                                </Button>
                                <Button asChild variant="ghost" size="lg">
                                    <Link href={`/topics/${topic.slug}`}>
                                        Cancel
                                    </Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </main>
        </PublicShell>
    );
}
