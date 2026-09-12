import { Form, Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    Bookmark,
    MessagesSquare,
    PenLine,
    Search,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { MemberLink } from '@/components/community';
import { PublicShell } from '@/components/public-shell';
import { TopicStarters } from '@/components/topic-starters';
import { Button } from '@/components/ui/button';
import type { PaginatedTopics, User } from '@/types';

type Props = {
    topics: PaginatedTopics & { total: number };
    view: 'latest' | 'unanswered';
    search: string;
};

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(value));
}

export default function TopicsIndex({ topics, view, search }: Props) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    const [topicTitle, setTopicTitle] = useState('');
    const [previousTitle, setPreviousTitle] = useState<string | null>(null);
    const topicInput = useRef<HTMLInputElement>(null);
    const unanswered = view === 'unanswered';
    const emptyCommunity = !search && !unanswered && topics.total === 0;
    const filterUrl = (value: string) =>
        `/topics?${new URLSearchParams({ view: value, q: search })}#topics`;

    function focusTopic() {
        topicInput.current?.focus();
        topicInput.current?.scrollIntoView({
            block: 'center',
            behavior: 'instant',
        });
    }

    function chooseStarter(title: string) {
        setPreviousTitle(topicTitle);
        setTopicTitle(title);
        focusTopic();
    }

    function undoStarter() {
        if (previousTitle !== null) {
            setTopicTitle(previousTitle);
            setPreviousTitle(null);
            focusTopic();
        }
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
                            Find a useful approach, share yours, or figure it
                            out together.
                        </p>
                    </div>
                    <Form
                        key={`${view}:${search}`}
                        action="/topics#topics"
                        method="get"
                        options={{ preserveState: true }}
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
                            placeholder="Search topics"
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
                                    What would you like to share or figure out?
                                </label>
                            </div>
                            <div className="wb-compose-row">
                                <input
                                    ref={topicInput}
                                    id="new-topic"
                                    name="title"
                                    value={topicTitle}
                                    onChange={(event) => {
                                        setTopicTitle(event.target.value);
                                        setPreviousTitle(null);
                                    }}
                                    required
                                    maxLength={160}
                                    aria-describedby="new-topic-hint"
                                    placeholder="For example: Making time to learn after work"
                                />
                                <button type="submit">
                                    Continue
                                    <ArrowRight aria-hidden="true" />
                                </button>
                            </div>
                            <p id="new-topic-hint">
                                {auth.user
                                    ? 'Start with a title. You can add your method on the next page.'
                                    : 'Start with a title. You’ll log in to finish your topic.'}{' '}
                                Nothing is published yet.
                            </p>
                            <div
                                className="wb-starter-feedback"
                                aria-live="polite"
                                aria-atomic="true"
                            >
                                {previousTitle !== null && (
                                    <>
                                        <span>Idea added. Make it yours.</span>
                                        <button
                                            type="button"
                                            onClick={undoStarter}
                                        >
                                            Undo
                                        </button>
                                    </>
                                )}
                            </div>
                        </Form>

                        <div className="wb-feed-toolbar">
                            <nav
                                aria-label="Filter topics"
                                className="wb-feed-nav"
                            >
                                <Link
                                    href={filterUrl('latest')}
                                    preserveState
                                    aria-current={
                                        unanswered ? undefined : 'page'
                                    }
                                >
                                    <BookOpen aria-hidden="true" />
                                    Latest
                                </Link>
                                <Link
                                    href={filterUrl('unanswered')}
                                    preserveState
                                    aria-current={
                                        unanswered ? 'page' : undefined
                                    }
                                >
                                    <MessagesSquare aria-hidden="true" />
                                    Needs a method
                                </Link>
                            </nav>

                            {!emptyCommunity && (
                                <span className="wb-topic-count">
                                    {topics.total}{' '}
                                    {topics.total === 1 ? 'topic' : 'topics'}
                                </span>
                            )}
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
                                {topics.total}{' '}
                                {topics.total === 1 ? 'topic' : 'topics'}{' '}
                                matching “{search}” ·{' '}
                                <Link
                                    href={`/topics?view=${view}#topics`}
                                    preserveState
                                >
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
                                                'Know a way to do this? Share what works for you.'}
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
                                                {topic.methods_count
                                                    ? `${topic.methods_count} ${topic.methods_count === 1 ? 'method' : 'methods'}`
                                                    : 'Open for a first method'}
                                            </span>
                                            {topic.saves_count > 0 && (
                                                <span
                                                    className="text-muted-foreground"
                                                    title="Saves by members other than the topic author"
                                                >
                                                    <Bookmark aria-hidden="true" />
                                                    {topic.saves_count}{' '}
                                                    {topic.saves_count === 1
                                                        ? 'save'
                                                        : 'saves'}
                                                </span>
                                            )}
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
                        ) : emptyCommunity ? (
                            <div className="wb-empty wb-first-topic">
                                <BookOpen
                                    aria-hidden="true"
                                    className="wb-empty-icon"
                                />
                                <h3>
                                    A small thing you know can help someone
                                    else.
                                </h3>
                                <p>
                                    There are no topics yet. Start with an
                                    everyday task, a useful habit, or something
                                    you’re curious about. You don’t need to be
                                    an expert.
                                </p>
                                <TopicStarters onChoose={chooseStarter} />
                            </div>
                        ) : (
                            <div className="wb-empty">
                                <Search
                                    aria-hidden="true"
                                    className="wb-empty-icon"
                                />
                                <h3>
                                    {search
                                        ? 'No matching topics yet'
                                        : 'No topics are waiting for a first method'}
                                </h3>
                                <p>
                                    {search
                                        ? 'Try fewer words or explore all topics. You can also start a topic about this.'
                                        : 'Explore the other topics. Your way of doing something may help someone new.'}
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <Button asChild variant="outline">
                                        <Link
                                            href="/topics#topics"
                                            preserveState
                                        >
                                            Explore all topics
                                        </Link>
                                    </Button>
                                    {search && (
                                        <Button asChild variant="ghost">
                                            <Link
                                                href={`/topics/create?title=${encodeURIComponent(search)}`}
                                            >
                                                Start this topic
                                                <ArrowRight aria-hidden="true" />
                                            </Link>
                                        </Button>
                                    )}
                                </div>
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
                                            preserveState
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
                                            preserveState
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
                            Real steps. Shared experience.
                        </h2>
                        <ol className="wb-guide-list">
                            <li>
                                <span aria-hidden="true">01</span>
                                <div>
                                    <strong>
                                        Find something you want to do
                                    </strong>
                                    <p>
                                        That’s a topic. Start one or explore
                                        what’s here.
                                    </p>
                                </div>
                            </li>
                            <li>
                                <span aria-hidden="true">02</span>
                                <div>
                                    <strong>See how someone does it</strong>
                                    <p>
                                        That’s a method: practical steps you can
                                        try.
                                    </p>
                                </div>
                            </li>
                            <li>
                                <span aria-hidden="true">03</span>
                                <div>
                                    <strong>
                                        Tried it? Share what happened
                                    </strong>
                                    <p>
                                        What worked, what didn’t, or what you
                                        changed. That’s an experience.
                                    </p>
                                </div>
                            </li>
                        </ol>
                        <details className="wb-worked-example">
                            <summary>See a simple example</summary>
                            <p className="wb-example-label">
                                Illustration only, not a community post.
                            </p>
                            <dl>
                                <dt>Topic</dt>
                                <dd>Making time to learn after work</dd>
                                <dt>Method</dt>
                                <dd>
                                    Set aside 15 minutes after dinner and
                                    practise one small thing.
                                </dd>
                                <dt>Experience</dt>
                                <dd>
                                    “I tried it for a week. Short sessions were
                                    easier to fit in, but I needed a reminder.”
                                </dd>
                            </dl>
                        </details>
                        <details className="wb-worked-example">
                            <summary>Content rules and review</summary>
                            <p>
                                Share useful experiences. Do not post
                                pornography, graphic abuse, threats, hateful
                                attacks, dangerous instructions, scams or
                                someone else’s private information.
                            </p>
                            <p>
                                Public text and uploaded photos may be checked
                                by OpenAI before publication. Flagged
                                submissions can be held privately for human
                                review. Review records expire after 30 days;
                                administrators can correct mistaken decisions.
                            </p>
                            <p>
                                Report harmful contributions using their Report
                                action. Discussing health or recovery
                                respectfully is welcome.
                            </p>
                        </details>
                        {!emptyCommunity && (
                            <div className="wb-starters">
                                <h3>Need a starting point?</h3>
                                <TopicStarters onChoose={chooseStarter} />
                            </div>
                        )}
                    </aside>
                </div>
            </main>
        </PublicShell>
    );
}
