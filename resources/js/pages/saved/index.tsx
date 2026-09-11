import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Bookmark, MessagesSquare } from 'lucide-react';
import { MemberLink } from '@/components/community';
import { PublicShell } from '@/components/public-shell';
import { SaveTopicButton } from '@/components/save-topic-button';
import { Button } from '@/components/ui/button';
import type { PaginatedTopics } from '@/types';

type Props = {
    topics: PaginatedTopics & { total: number };
};

export default function SavedTopicsIndex({ topics }: Props) {
    return (
        <PublicShell>
            <Head title="Saved topics">
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <main className="wb-notebook">
                <header className="wb-notebook-masthead">
                    <div>
                        <h1>Saved topics</h1>
                        <p>
                            Only you can see this list. Authors and visitors can
                            see totals, never who saved.
                        </p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/topics">
                            Explore topics
                            <ArrowRight aria-hidden="true" />
                        </Link>
                    </Button>
                </header>

                <section aria-labelledby="saved-heading">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <h2 id="saved-heading" className="font-semibold">
                            Most recently saved
                        </h2>
                        <span className="text-muted-foreground text-sm">
                            {topics.total}{' '}
                            {topics.total === 1 ? 'topic' : 'topics'}
                        </span>
                    </div>
                    {topics.data.length ? (
                        <div className="wb-entry-list">
                            {topics.data.map((topic) => (
                                <article key={topic.id} className="wb-entry">
                                    <div className="wb-entry-meta">
                                        <MemberLink user={topic.user} avatar />
                                    </div>
                                    <h3>
                                        <Link href={`/topics/${topic.slug}`}>
                                            {topic.title}
                                        </Link>
                                    </h3>
                                    <p className="wb-entry-description">
                                        {topic.description ||
                                            'Have you done this? Share the details of your approach.'}
                                    </p>
                                    <div className="wb-entry-bottom">
                                        <Link
                                            href={`/topics/${topic.slug}`}
                                            className="wb-entry-invite"
                                        >
                                            <MessagesSquare aria-hidden="true" />
                                            {topic.methods_count}{' '}
                                            {topic.methods_count === 1
                                                ? 'method'
                                                : 'methods'}
                                            <ArrowRight aria-hidden="true" />
                                        </Link>
                                        <SaveTopicButton
                                            topicSlug={topic.slug}
                                            saved
                                            authenticated
                                        />
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="wb-empty">
                            <Bookmark
                                aria-hidden="true"
                                className="wb-empty-icon"
                            />
                            <h3>Keep useful topics close</h3>
                            <p>
                                Use Save topic on a topic you want to revisit.
                                Your saved list is private.
                            </p>
                            <Button asChild variant="outline">
                                <Link href="/topics">
                                    Explore topics
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        </div>
                    )}

                    {topics.last_page > 1 && (
                        <nav
                            aria-label="Saved topic pagination"
                            className="wb-pagination"
                        >
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
                            <span>
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
                        </nav>
                    )}
                </section>
            </main>
        </PublicShell>
    );
}
