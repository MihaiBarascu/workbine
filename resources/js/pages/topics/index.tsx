import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    MessagesSquare,
    Search,
    PenLine,
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
                title={search ? `Search: ${search}` : 'Explore the community'}
            />
            <main className="wb-notebook">
                <header className="wb-notebook-masthead">
                    <div>
                        <h1>Explore the community</h1>
                        <p>
                            Real approaches, shared by the people who tried
                            them.
                        </p>
                    </div>
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
                </header>

                <div className="wb-layout">
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
                            <div className="wb-compose-heading">
                                <PenLine aria-hidden="true" />
                                <label htmlFor="new-topic">
                                    What are you working on?
                                </label>
                            </div>
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
                                    placeholder="A topic you know about, or want to explore…"
                                />
                                <button type="submit">
                                    Start a topic
                                    <ArrowUpRight aria-hidden="true" />
                                </button>
                            </div>
                            <p>
                                Share your own method, or invite others to share
                                theirs.
                            </p>
                        </Form>

                        <div className="wb-feed-toolbar">
                            <nav
                                aria-label="Filter topics"
                                className="wb-feed-nav"
                            >
                                <Link
                                    href={filterUrl('latest')}
                                    aria-current={
                                        unanswered ? undefined : 'page'
                                    }
                                >
                                    <BookOpen aria-hidden="true" />
                                    Latest
                                </Link>
                                <Link
                                    href={filterUrl('unanswered')}
                                    aria-current={
                                        unanswered ? 'page' : undefined
                                    }
                                >
                                    <MessagesSquare aria-hidden="true" />
                                    Needs a method
                                </Link>
                            </nav>
                            <span className="wb-topic-count">
                                {topics.total}{' '}
                                {topics.total === 1 ? 'topic' : 'topics'}
                            </span>
                        </div>
                        <h2 id="topics-heading" className="sr-only">
                            {search
                                ? 'Search results'
                                : unanswered
                                  ? 'Topics waiting for a first method'
                                  : 'Latest from the community'}
                        </h2>
                        {search && (
                            <p role="status" className="wb-search-state">
                                Matching “{search}” ·{' '}
                                <Link href={`/topics?view=${view}#topics`}>
                                    Clear search
                                </Link>
                            </p>
                        )}

                        {topics.data.length ? (
                            <div className="wb-entry-list">
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
                                            <span
                                                className={
                                                    topic.methods_count
                                                        ? 'wb-method-count'
                                                        : 'wb-method-count wb-method-count-empty'
                                                }
                                            >
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
                                <BookOpen
                                    aria-hidden="true"
                                    className="wb-empty-icon"
                                />
                                <h3>
                                    {search
                                        ? 'No matching topics yet'
                                        : unanswered
                                          ? 'No topics are waiting for a first method'
                                          : 'Every useful topic starts with someone.'}
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
                                            : 'Start a topic'}
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
                        <p className="wb-kicker">How Workbine works</p>
                        <h2 id="guide-heading" className="wb-guide-heading">
                            A little experience goes a long way.
                        </h2>
                        <p className="wb-guide-intro">
                            A topic brings people together. Methods show how
                            they approach it. Experiences tell you what happened
                            when others tried.
                        </p>
                        <ol className="wb-guide-list">
                            <li>
                                <span>01</span>
                                <div>
                                    <strong>Start with the situation</strong>
                                    <p>
                                        A goal, a constraint, something you
                                        wanted to figure out.
                                    </p>
                                </div>
                            </li>
                            <li>
                                <span>02</span>
                                <div>
                                    <strong>Share the actual steps</strong>
                                    <p>
                                        What you did and what you used. Credit
                                        the source if it came from someone else.
                                    </p>
                                </div>
                            </li>
                            <li>
                                <span>03</span>
                                <div>
                                    <strong>Tell us how it went</strong>
                                    <p>
                                        What worked, what didn’t, and what you’d
                                        change.
                                    </p>
                                </div>
                            </li>
                        </ol>
                        <div className="wb-starters">
                            <h3>Need a starting point?</h3>
                            <p>
                                These are prompts, not published topics. Make
                                one your own.
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
