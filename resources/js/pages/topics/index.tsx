import { Head, Link } from '@inertiajs/react';
import { ArrowRight, MessageCircleMore, Sparkles } from 'lucide-react';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { PaginatedTopics } from '@/types';

type Props = {
    topics: PaginatedTopics;
};

function formatDate(value: string | null): string {
    if (!value) {
        return '';
    }

    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(value));
}

export default function TopicsIndex({ topics }: Props) {
    return (
        <PublicShell>
            <Head title="Find what works" />

            <main>
                <section className="relative overflow-hidden border-b">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,var(--color-muted),transparent_42%)] opacity-70" />
                    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
                        <div className="max-w-4xl">
                            <div className="bg-muted text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium">
                                <Sparkles className="size-4" />
                                Useful things people actually tried
                            </div>

                            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl lg:text-7xl">
                                Find what works. Share what worked for you.
                            </h1>

                            <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-8 sm:text-xl">
                                Workbine is like asking a practical friend who
                                has already tried it. Real methods, real
                                context, less noise.
                            </p>

                            <div className="mt-9 flex flex-wrap gap-3">
                                <Button asChild size="lg">
                                    <Link href="/topics/create">
                                        Start a topic
                                        <ArrowRight />
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" size="lg">
                                    <a href="#topics">Browse topics</a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    id="topics"
                    className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8"
                >
                    <div className="mb-8 flex items-end justify-between gap-6">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">
                                Community topics
                            </p>
                            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                                Things people want better answers to
                            </h2>
                        </div>
                    </div>

                    {topics.data.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {topics.data.map((topic) => (
                                <Link
                                    key={topic.id}
                                    href={`/topics/${topic.slug}`}
                                    className="group block"
                                >
                                    <Card className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
                                        <CardHeader>
                                            <CardDescription>
                                                Shared by {topic.user.name}
                                                {topic.created_at
                                                    ? ` · ${formatDate(topic.created_at)}`
                                                    : ''}
                                            </CardDescription>
                                            <CardTitle className="text-xl leading-7 group-hover:underline group-hover:underline-offset-4">
                                                {topic.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground line-clamp-3 text-sm leading-6">
                                                {topic.description ??
                                                    'Open the topic to see how people approach it and what actually worked for them.'}
                                            </p>
                                            <div className="text-muted-foreground mt-5 flex items-center gap-2 text-xs font-medium">
                                                <MessageCircleMore className="size-4" />
                                                Methods and experiences live
                                                here
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="border-border bg-muted/20 rounded-2xl border border-dashed px-6 py-16 text-center">
                            <MessageCircleMore className="text-muted-foreground mx-auto size-9" />
                            <h3 className="mt-4 text-lg font-semibold">
                                No topics yet
                            </h3>
                            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">
                                Start with something you know people could solve
                                better together.
                            </p>
                            <Button asChild className="mt-6">
                                <Link href="/topics/create">
                                    Start the first topic
                                </Link>
                            </Button>
                        </div>
                    )}

                    {topics.last_page > 1 && (
                        <div className="mt-10 flex items-center justify-between">
                            <Button
                                asChild={Boolean(topics.prev_page_url)}
                                variant="outline"
                                disabled={!topics.prev_page_url}
                            >
                                {topics.prev_page_url ? (
                                    <Link href={topics.prev_page_url}>
                                        Previous
                                    </Link>
                                ) : (
                                    <span>Previous</span>
                                )}
                            </Button>
                            <span className="text-muted-foreground text-sm">
                                Page {topics.current_page} of {topics.last_page}
                            </span>
                            <Button
                                asChild={Boolean(topics.next_page_url)}
                                variant="outline"
                                disabled={!topics.next_page_url}
                            >
                                {topics.next_page_url ? (
                                    <Link href={topics.next_page_url}>
                                        Next
                                    </Link>
                                ) : (
                                    <span>Next</span>
                                )}
                            </Button>
                        </div>
                    )}
                </section>
            </main>
        </PublicShell>
    );
}
