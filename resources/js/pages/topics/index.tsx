import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    MessagesSquare,
    Search,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import type { PaginatedTopics } from '@/types';

type Props = {
    topics: PaginatedTopics & { total: number };
    view: 'latest' | 'unanswered';
    search: string;
};

const starters = [
    'How do you find the first customer for a small project?',
    'What helped you learn a skill while working full-time?',
    'Which part of your weekly work have you made simpler?',
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
    const [question, setQuestion] = useState('');
    const questionInput = useRef<HTMLInputElement>(null);
    const unanswered = view === 'unanswered';
    const filterUrl = (value: string) =>
        `/topics?${new URLSearchParams({ view: value, q: search })}#topics`;

    function chooseStarter(title: string) {
        setQuestion(title);
        questionInput.current?.focus();
        questionInput.current?.scrollIntoView({
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
                        <p className="wb-kicker">
                            Notes from people doing the work
                        </p>
                        <h1>The community notebook.</h1>
                        <p>
                            Good questions. Methods worth trying. The honest
                            story afterwards.
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
                        <p className="wb-kicker">Browse the notebook</p>
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
                            className="wb-compose"
                        >
                            <label htmlFor="new-question">
                                What are you figuring out?
                            </label>
                            <div className="wb-compose-row">
                                <input
                                    ref={questionInput}
                                    id="new-question"
                                    name="title"
                                    value={question}
                                    onChange={(event) =>
                                        setQuestion(event.target.value)
                                    }
                                    required
                                    maxLength={160}
                                    placeholder="Ask people who have actually tried it…"
                                />
                                <button type="submit">
                                    Start a topic
                                    <ArrowUpRight aria-hidden="true" />
                                </button>
                            </div>
                            <p>
                                A practical question is enough to start. Add
                                context on the next page.
                            </p>
                        </Form>

                        <Form
                            key={`${view}:${search}`}
                            action="/topics#topics"
                            method="get"
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
                                placeholder="Look through the notebook"
                            />
                            <input type="hidden" name="view" value={view} />
                            <button type="submit">Search</button>
                        </Form>

                        <div className="wb-feed-title">
                            <h2 id="topics-heading">
                                {search
                                    ? 'From the notebook'
                                    : unanswered
                                      ? 'Questions waiting for experience'
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
                                        <Link href={`/topics/${topic.slug}`}>
                                            <div className="wb-entry-meta">
                                                <span
                                                    className="wb-initial"
                                                    aria-hidden="true"
                                                >
                                                    {Array.from(
                                                        topic.user.name.trim(),
                                                    )[0] ?? '?'}
                                                </span>
                                                <span>{topic.user.name}</span>
                                                {topic.created_at && (
                                                    <time
                                                        dateTime={
                                                            topic.created_at
                                                        }
                                                    >
                                                        {formatDate(
                                                            topic.created_at,
                                                        )}
                                                    </time>
                                                )}
                                            </div>
                                            <h3>{topic.title}</h3>
                                            <p className="wb-entry-description">
                                                {topic.description ||
                                                    'Have you done this? The details of your approach could help someone else.'}
                                            </p>
                                            <div className="wb-entry-bottom">
                                                <span>
                                                    <MessagesSquare aria-hidden="true" />
                                                    {topic.methods_count}{' '}
                                                    {topic.methods_count === 1
                                                        ? 'method'
                                                        : 'methods'}
                                                </span>
                                                <span className="wb-entry-invite">
                                                    {topic.methods_count
                                                        ? 'Read the approaches'
                                                        : 'Bring the first method'}
                                                    <ArrowRight aria-hidden="true" />
                                                </span>
                                            </div>
                                        </Link>
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
                                          : 'A good community starts with a real question.'}
                                </h3>
                                <p>
                                    {search
                                        ? 'Try a different phrase, change the filter, or ask the question yourself. Someone else may be figuring out the same thing.'
                                        : unanswered
                                          ? 'Explore the other topics and add another approach. There is rarely just one way to do something.'
                                          : 'What did you have to figure out the hard way? Bring a question, share a method, and make the next person’s attempt a little easier.'}
                                </p>
                                <Button asChild variant="outline">
                                    <Link
                                        href={
                                            unanswered && !search
                                                ? '/topics#topics'
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
                        <p className="wb-kicker">The Workbine field guide</p>
                        <h2 id="guide-heading" className="wb-guide-heading">
                            Leave the useful
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
                                        and constraints change the answer.
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
                            <p className="wb-kicker">
                                A question to start with
                            </p>
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
