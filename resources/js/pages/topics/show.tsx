import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, MessageSquareText, UserRound } from 'lucide-react';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TopicSummary } from '@/types';

type Props = {
    topic: TopicSummary;
};

function formatDate(value: string | null): string {
    if (!value) {
        return '';
    }

    return new Intl.DateTimeFormat('en', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(value));
}

export default function TopicShow({ topic }: Props) {
    return (
        <PublicShell>
            <Head title={topic.title} />

            <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
                <Button asChild variant="ghost" className="mb-6 -ml-3">
                    <Link href="/topics">
                        <ArrowLeft />
                        All topics
                    </Link>
                </Button>

                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <div>
                        <p className="text-muted-foreground text-sm font-medium">
                            Community topic
                        </p>
                        <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl lg:text-5xl">
                            {topic.title}
                        </h1>

                        {topic.description && (
                            <p className="text-muted-foreground mt-6 max-w-3xl text-lg leading-8 whitespace-pre-wrap">
                                {topic.description}
                            </p>
                        )}

                        <section className="mt-12">
                            <div className="mb-5 flex items-end justify-between gap-4">
                                <div>
                                    <p className="text-muted-foreground text-sm font-medium">
                                        Methods
                                    </p>
                                    <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">
                                        How people actually do it
                                    </h2>
                                </div>
                            </div>

                            <div className="border-border bg-muted/20 rounded-2xl border border-dashed px-6 py-12 text-center">
                                <MessageSquareText className="text-muted-foreground mx-auto size-9" />
                                <h3 className="mt-4 text-lg font-semibold">
                                    No methods shared yet
                                </h3>
                                <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm leading-6">
                                    The useful part comes next: someone explains
                                    the exact method that worked for them, with
                                    context and evidence others can validate.
                                </p>
                            </div>
                        </section>
                    </div>

                    <aside>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    About this topic
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="flex items-start gap-3">
                                    <UserRound className="text-muted-foreground mt-0.5 size-4" />
                                    <div>
                                        <p className="text-muted-foreground">
                                            Started by
                                        </p>
                                        <p className="font-medium">
                                            {topic.user.name}
                                        </p>
                                    </div>
                                </div>

                                {topic.created_at && (
                                    <div>
                                        <p className="text-muted-foreground">
                                            Published
                                        </p>
                                        <p className="font-medium">
                                            {formatDate(topic.created_at)}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </main>
        </PublicShell>
    );
}
