import { Form, Head, Link } from '@inertiajs/react';
import { ArrowRight, Lightbulb, MessageCircleMore, Plus, Search } from 'lucide-react';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PaginatedTopics } from '@/types';

type Props = {
    topics: PaginatedTopics;
    view: 'latest' | 'unanswered';
    search: string;
};

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('en', {
        month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(value));
}

export default function TopicsIndex({ topics, view, search }: Props) {
    const unanswered = view === 'unanswered';
    const filterUrl = (value: string) => `/topics?${new URLSearchParams({ view: value, q: search })}#topics`;

    return (
        <PublicShell>
            <Head title={search ? `Search: ${search}` : 'Find what works'} />
            <main>
                <section className="border-b bg-teal-50/60 dark:bg-teal-950/20">
                    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center lg:px-8 lg:py-16">
                        <div>
                            <p className="mb-5 text-sm font-medium text-teal-800 dark:text-teal-300">Practical knowledge. Real people.</p>
                            <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl lg:text-6xl">
                                Find what works.
                                <span className="block text-teal-700 dark:text-teal-300">Pass it on.</span>
                            </h1>
                            <p className="text-muted-foreground mt-5 max-w-xl text-lg leading-8">
                                Find out what someone actually did, how they did it, and what happened when others tried it.
                            </p>
                            <div className="mt-7 flex flex-wrap gap-3">
                                <Button asChild size="lg"><a href="#topics">Explore topics<ArrowRight aria-hidden="true" /></a></Button>
                                <Button asChild variant="outline" size="lg"><Link href="/topics/create"><Plus aria-hidden="true" />Start a topic</Link></Button>
                            </div>
                        </div>
                        <aside className="bg-background hidden rounded-2xl border p-6 shadow-sm lg:block">
                            <Lightbulb className="mb-4 size-6 text-teal-700 dark:text-teal-300" aria-hidden="true" />
                            <h2 className="text-lg font-semibold tracking-tight">The useful part is in the details.</h2>
                            <ol className="text-muted-foreground mt-4 list-decimal space-y-3 pl-5 text-sm leading-6">
                                <li>Ask a practical question.</li>
                                <li>Share a method with steps and context.</li>
                                <li>Try it. Share the result, including the limits.</li>
                            </ol>
                        </aside>
                    </div>
                </section>

                <section id="topics" aria-labelledby="topics-heading" className="mx-auto max-w-6xl scroll-mt-36 px-4 py-10 sm:px-6 lg:px-8">
                    <Form key={`${view}:${search}`} action="/topics#topics" method="get" className="mb-8" role="search">
                        {({ processing }) => (
                            <>
                                <Label htmlFor="topic-search" className="mb-2 block">Search topics</Label>
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <Input id="topic-search" name="q" type="search" maxLength={120} defaultValue={search} placeholder="What are you figuring out?" className="h-11 flex-1" />
                                    <input type="hidden" name="view" value={view} />
                                    <Button type="submit" disabled={processing} className="h-11"><Search aria-hidden="true" />Search</Button>
                                </div>
                            </>
                        )}
                    </Form>
                    <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-sm">From the community</p>
                            <h2 id="topics-heading" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                                {search ? 'Find a useful starting point' : unanswered ? 'A good question needs your experience' : 'What are people figuring out?'}
                            </h2>
                            {search && <p role="status" className="text-muted-foreground mt-2 text-sm [overflow-wrap:anywhere]">Matching “{search}” · <Link className="underline underline-offset-4" href={`/topics?view=${view}#topics`}>Clear search</Link></p>}
                        </div>
                        <nav aria-label="Filter topics" className="bg-muted/50 flex flex-wrap gap-1 rounded-xl border p-1">
                            <Button asChild variant={unanswered ? 'ghost' : 'secondary'} size="sm"><Link href={filterUrl('latest')} aria-current={unanswered ? undefined : 'page'}>Latest</Link></Button>
                            <Button asChild variant={unanswered ? 'secondary' : 'ghost'} size="sm"><Link href={filterUrl('unanswered')} aria-current={unanswered ? 'page' : undefined}>Needs a method</Link></Button>
                        </nav>
                    </div>

                    {topics.data.length > 0 ? (
                        <div className="overflow-hidden rounded-2xl border">
                            {topics.data.map((topic) => (
                                <article key={topic.id} className="bg-card border-b last:border-b-0">
                                    <Link href={`/topics/${topic.slug}`} className="hover:bg-muted/40 focus-visible:ring-ring group flex flex-col gap-4 p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                                <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-900 dark:bg-teal-900 dark:text-teal-100">{Array.from(topic.user.name.trim())[0] ?? '?'}</span>
                                                <span className="[overflow-wrap:anywhere]">{topic.user.name}</span>
                                                {topic.created_at && <time dateTime={topic.created_at}>{formatDate(topic.created_at)}</time>}
                                            </div>
                                            <h3 className="text-lg leading-7 font-semibold tracking-tight [overflow-wrap:anywhere] group-hover:text-teal-700 sm:text-xl dark:group-hover:text-teal-300">{topic.title}</h3>
                                            <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-6 [overflow-wrap:anywhere]">{topic.description || 'Have you done this? Share the approach that worked for you.'}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center justify-between gap-4 sm:w-36 sm:flex-col sm:items-end">
                                            <span className="inline-flex items-center gap-2 text-sm font-medium"><MessageCircleMore className="size-4 text-teal-700 dark:text-teal-300" aria-hidden="true" />{topic.methods_count} {topic.methods_count === 1 ? 'method' : 'methods'}</span>
                                            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">{topic.methods_count === 0 ? 'Be the first to share' : 'See what worked'}<ArrowRight className="size-3.5" aria-hidden="true" /></span>
                                        </div>
                                    </Link>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-muted/20 rounded-2xl border border-dashed px-6 py-14 text-center">
                            <MessageCircleMore className="mx-auto size-9 text-teal-700 dark:text-teal-300" aria-hidden="true" />
                            <h3 className="mt-4 text-xl font-semibold">{search ? 'No matching topics yet' : unanswered ? 'No topics are waiting for a first method' : 'Every useful method starts with a question'}</h3>
                            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">{search ? 'Try fewer words, change the filter, or bring your question to the community.' : unanswered ? 'Explore existing topics to add another approach, or start a question of your own.' : 'Bring something you are figuring out. Give people enough context to share a useful answer.'}</p>
                            <Button asChild className="mt-6"><Link href={unanswered && !search ? '/topics#topics' : '/topics/create'}>{unanswered && !search ? 'Explore all topics' : 'Start a topic'}</Link></Button>
                        </div>
                    )}

                    {topics.last_page > 1 && (
                        <nav aria-label="Topic pagination" className="mt-8 flex items-center justify-between gap-3">
                            <Button asChild={Boolean(topics.prev_page_url)} variant="outline" disabled={!topics.prev_page_url}>{topics.prev_page_url ? <Link href={`${topics.prev_page_url}#topics`}>Previous</Link> : <span>Previous</span>}</Button>
                            <span className="text-muted-foreground text-center text-sm">Page {topics.current_page} of {topics.last_page}</span>
                            <Button asChild={Boolean(topics.next_page_url)} variant="outline" disabled={!topics.next_page_url}>{topics.next_page_url ? <Link href={`${topics.next_page_url}#topics`}>Next</Link> : <span>Next</span>}</Button>
                        </nav>
                    )}
                </section>
            </main>
        </PublicShell>
    );
}
