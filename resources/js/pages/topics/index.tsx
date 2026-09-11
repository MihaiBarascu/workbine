import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    MessagesSquare,
    Search,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { MemberLink } from '@/components/community';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import type { PaginatedTopics } from '@/types';

type Props = {
    topics: PaginatedTopics & { total: number };
    view: 'latest' | 'unanswered';
    search: string;
};

const starters = [
    'Automating product imports for an online store',
    'Learning a new skill while working full-time',
    'Finding the first customer for a small project',
];

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(value));
}

export default function TopicsIndex({ topics, view, search }: Props) {
    const [topicTitle, setTopicTitle] = useState('');
    const topicInput = useRef<HTMLInputElement>(null);
    const unanswered = view === 'unanswered';
    const filterUrl = (value: string) =>
        `/topics?${new URLSearchParams({ view: value, q: search })}#topics`;

    function chooseStarter(title: string) {
        setTopicTitle(title);
        topicInput.current?.focus();
        topicInput.current?.scrollIntoView({
            block: 'center',
            behavior: 'instant',
        });
    }

    return (
        <PublicShell>
            <Head
                title={search ? `Search: ${search}` : 'The community notebook'}
            />
            <main className="wb-notebook">
                <header className="wb-notebook-masthead">
                    <div>
                        <p className="wb-kicker">The Workbine community</p>
                        <h1>Share how you do it. Discover how others do.</h1>
                        <p>
                            Start a topic with your own method, or open a
                            subject you want to explore. Share approaches and
                            learn from what happens in practice.
                        </p>
                    </div>
                    <div className="wb-masthead-mark" aria-hidden="true">
                        <svg viewBox="0 0 48 48" fill="none">
                            <path
                                d="M24 3V45M3 24H45M9 9L39 39M9 39L39 9"
                                stroke="currentColor"
                                strokeWidth="2"
                            />
                            <circle
                                cx="24"
                                cy="24"
                                r="9"
                                fill="var(--wb-paper)"
                                stroke="currentColor"
                                strokeWidth="2"
                            />
                        </svg>
                        <span>
                            Many ways.
                            <br />
                            Real attempts.
                        </span>
                    </div>
                </header>

                <div className="wb-layout">
                    <aside className="wb-sidebar">
                        <p className="wb-kicker">Explore</p>
                        <nav aria-label="Filter topics" className="wb-feed-nav">
                            <Link
                                href={filterUrl('latest')}
                                aria-current={unanswered ? undefined : 'page'}
                            >
                                <BookOpen aria-hidden="true" />
                                Latest
                            </Link>
                            <Link
                                href={filterUrl('unanswered')}
                                aria-current={unanswered ? 'page' : undefined}
                            >
                                <MessagesSquare aria-hidden="true" />
                                Needs a method
                            </Link>
                        </nav>
                        <div className="wb-side-note">
                            <strong>Useful beats impressive.</strong>
                            A small thing that worked in a real situation can be
                            more useful than the perfect advice.
                        </div>
                    </aside>

                    <section
                        className="wb-feed"
                        id="topics"
                        aria-labelledby="topics-heading"
                    >
                        <Form
                            action="/topics/create"
                            method="get"
                            disableWhileProcessing
                            className="wb-compose"
                        >
                            <label htmlFor="new-topic">
                                What would you like to share or explore?
                            </label>
                            <div className="wb-compose-row">
                                <input
                                    ref={topicInput}
                                    id="new-topic"
                                    name="title"
                                    value={topicTitle}
                                    onChange={(event) =>
                                        setTopicTitle(event.target.value)
                                    }
                                    required
                                    maxLength={160}
                                    placeholder="A subject, a goal or a practical question…"
                                />
                                <button type="submit">
                                    Start a topic
                                    <ArrowUpRight aria-hidden="true" />
                                </button>
                            </div>
                            <p>
                                Add context and, optionally, your own method on
                                the next page.
                            </p>
                        </Form>

                        <Form
                            key={`${view}:${search}`}
                            action="/topics#topics"
                            method="get"
                            disableWhileProcessing
                            role="search"
                            className="wb-search"
                        >
                            <Search aria-hidden="true" />
                            <label htmlFor="topic-search" className="sr-only">
                                Search topics
                            </label>
                            <input
                                id="topic-search"
                                name="q"
                                type="search"
                                defaultValue={search}
                                maxLength={120}
                                placeholder="Search topics and ideas"
                            />
                            <input type="hidden" name="view" value={view} />
                            <button type="submit">Search</button>
                        </Form>

                        <div className="wb-feed-title">
                            <h2 id="topics-heading">
                                {search
                                    ? 'From the notebook'
                                    : unanswered
                                      ? 'Topics waiting for a first method'
                                      : 'Latest from the community'}
                            </h2>
                            <span>
                                {topics.total}{' '}
                                {topics.total === 1 ? 'topic' : 'topics'}
                            </span>
                        </div>
                        {search && (
                            <p role="status" className="wb-search-state">
                                Matching “{search}” ·{' '}
                                <Link href={`/topics?view=${view}#topics`}>
                                    Clear search
                                </Link>
                            </p>
                        )}

                        {topics.data.length ? (
                            <div>
                                {topics.data.map((topic) => (
                                    <article
                                        key={topic.id}
                                        className="wb-entry"
                                    >
                                        <div className="wb-entry-meta">
                                            <MemberLink
                                                user={topic.user}
                                                avatar
                                            />
                                            {topic.created_at && (
                                                <time
                                                    dateTime={topic.created_at}
                                                >
                                                    {formatDate(
                                                        topic.created_at,
                                                    )}
                                                </time>
                                            )}
                                        </div>
                                        <h3>
                                            <Link
                                                href={`/topics/${topic.slug}`}
                                            >
                                                {topic.title}
                                            </Link>
                                        </h3>
                                        <p className="wb-entry-description">
                                            {topic.description ||
                                                'Have you done this? Share the details of your approach.'}
                                        </p>
                                        <div className="wb-entry-bottom">
                                            <span>
                                                <MessagesSquare aria-hidden="true" />
                                                {topic.methods_count}{' '}
                                                {topic.methods_count === 1
                                                    ? 'method'
                                                    : 'methods'}
                                            </span>
                                            <Link
                                                className="wb-entry-invite"
                                                href={`/topics/${topic.slug}`}
                                            >
                                                {topic.methods_count
                                                    ? 'Read the approaches'
                                                    : 'Share the first method'}
                                                <ArrowRight aria-hidden="true" />
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="wb-empty">
                                <p className="wb-kicker">
                                    {search || unanswered
                                        ? 'Keep looking. Or start something.'
                                        : 'The first page is still blank'}
                                </p>
                                <h3>
                                    {search
                                        ? 'No matching topics yet'
                                        : unanswered
                                          ? 'No topics are waiting for a first method'
                                          : 'Share a useful approach. Open a subject to explore.'}
                                </h3>
                                <p>
                                    {search
                                        ? 'Try a different phrase, change the filter, or start this topic with your own method or context.'
                                        : unanswered
                                          ? 'Explore the other topics and add another approach. There is rarely just one way to do something.'
                                          : 'Start with something you know how to do, or something you want to explore. You can publish a topic with your method or invite others to share theirs.'}
                                </p>
                                <Button asChild variant="outline">
                                    <Link
                                        href={
                                            unanswered && !search
                                                ? '/topics#topics'
                                                : search
                                                  ? `/topics/create?title=${encodeURIComponent(search)}`
                                                  : '/topics/create'
                                        }
                                    >
                                        {unanswered && !search
                                            ? 'Explore all topics'
                                            : 'Write the first page'}
                                        <ArrowUpRight aria-hidden="true" />
                                    </Link>
                                </Button>
                            </div>
                        )}

                        {topics.last_page > 1 && (
                            <nav
                                aria-label="Topic pagination"
                                className="wb-pagination"
                            >
                                <Button
                                    asChild={Boolean(topics.prev_page_url)}
                                    variant="outline"
                                    disabled={!topics.prev_page_url}
                                >
                                    {topics.prev_page_url ? (
                                        <Link
                                            href={`${topics.prev_page_url}#topics`}
                                        >
                                            Previous
                                        </Link>
                                    ) : (
                                        <span>Previous</span>
                                    )}
                                </Button>
                                <span>
                                    Page {topics.current_page} of{' '}
                                    {topics.last_page}
                                </span>
                                <Button
                                    asChild={Boolean(topics.next_page_url)}
                                    variant="outline"
                                    disabled={!topics.next_page_url}
                                >
                                    {topics.next_page_url ? (
                                        <Link
                                            href={`${topics.next_page_url}#topics`}
                                        >
                                            Next
                                        </Link>
                                    ) : (
                                        <span>Next</span>
                                    )}
                                </Button>
                            </nav>
                        )}
                    </section>

                    <aside
                        className="wb-margin"
                        id="field-guide"
                        aria-labelledby="guide-heading"
                    >
                        <p className="wb-kicker">Community guide</p>
                        <h2 id="guide-heading" className="wb-guide-heading">
                            Keep the useful
                            <br />
                            part in.
                        </h2>
                        <ol className="wb-guide-list">
                            <li>
                                <span>01</span>
                                <div>
                                    <strong>The situation</strong>
                                    <p>
                                        What were you trying to do? Time, tools
                                        and constraints shape the approach.
                                    </p>
                                </div>
                            </li>
                            <li>
                                <span>02</span>
                                <div>
                                    <strong>The actual steps</strong>
                                    <p>
                                        Share what you did, not just what
                                        someone could do. Credit your sources.
                                    </p>
                                </div>
                            </li>
                            <li>
                                <span>03</span>
                                <div>
                                    <strong>What happened next</strong>
                                    <p>
                                        What worked? What fell short? An honest
                                        limit is useful knowledge too.
                                    </p>
                                </div>
                            </li>
                        </ol>
                        <div className="wb-starters">
                            <p className="wb-kicker">A topic to start with</p>
                            <p>
                                Prompts, not published topics. Pick one and make
                                it your own.
                            </p>
                            {starters.map((title) => (
                                <button
                                    key={title}
                                    type="button"
                                    onClick={() => chooseStarter(title)}
                                >
                                    {title}
                                    <ArrowUpRight aria-hidden="true" />
                                </button>
                            ))}
                        </div>
                    </aside>
                </div>
            </main>
        </PublicShell>
    );
}
