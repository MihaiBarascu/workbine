import { Form, Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    Flame,
    X,
    Users,
    Lightbulb,
    Sparkles,
    Bookmark,
    MessagesSquare,
    PenLine,
    Search,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MemberLink } from '@/components/community';
import { PublicShell } from '@/components/public-shell';
import { TopicCard } from '@/components/topic-card';
import { TopicStarters } from '@/components/topic-starters';
import { Button } from '@/components/ui/button';
import type { PaginatedTopics, PublicMember, User } from '@/types';

type Props = {
    topics: PaginatedTopics & { total: number };
    view: 'latest' | 'unanswered' | 'trending' | 'saved';
    sort: 'newest' | 'oldest' | 'active';
    scope: 'topics' | 'people';
    category: string;
    tag: string;
    categories: Record<string, string>;
    categoryCounts: Record<string, number>;
    availableTags: string[];
    people: {
        data: (PublicMember & {
            methods_count: number;
            topics_count: number;
        })[];
        total: number;
        current_page: number;
        last_page: number;
        next_page_url: string | null;
        prev_page_url: string | null;
    } | null;
    search: string;
};

export default function TopicsIndex({
    topics,
    view,
    search,
    sort,
    scope,
    category,
    tag,
    categories,
    categoryCounts,
    availableTags,
    people,
}: Props) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    const [topicTitle, setTopicTitle] = useState('');
    const [previousTitle, setPreviousTitle] = useState<string | null>(null);
    const topicInput = useRef<HTMLInputElement>(null);
    const unanswered = view === 'unanswered';
    const emptyCommunity =
        !search &&
        !category &&
        !tag &&
        view === 'latest' &&
        scope === 'topics' &&
        topics.total === 0;
    const [guideOpen, setGuideOpen] = useState(true);
    useEffect(() => {
        try {
            setGuideOpen(
                localStorage.getItem('workbine-guide-hidden') !== 'true',
            );
        } catch {
            /* Storage is optional. */
        }
    }, []);
    useEffect(() => {
        const focus = (event: KeyboardEvent) => {
            if (
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === 'k'
            ) {
                event.preventDefault();
                document.getElementById('topic-search')?.focus();
            }
        };
        window.addEventListener('keydown', focus);
        return () => window.removeEventListener('keydown', focus);
    }, []);
    function toggleGuide() {
        const next = !guideOpen;
        setGuideOpen(next);
        try {
            localStorage.setItem('workbine-guide-hidden', String(!next));
        } catch {
            /* Storage is optional. */
        }
    }
    const filterUrl = (value: string) =>
        `/topics?${new URLSearchParams({ view: value, q: search, category, tag, sort, scope: 'topics' })}#topics`;

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

    const searchForm = (
        <Form
            key={`${view}:${search}:${scope}`}
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
                placeholder="Search topics, methods, people…"
            />
            <input type="hidden" name="view" value={view} />
            <select name="scope" aria-label="Search in" defaultValue={scope}>
                <option value="topics">Topics</option>
                <option value="people">People</option>
            </select>
            <button type="submit">Search</button>
        </Form>
    );

    return (
        <PublicShell discovery={{ categories, category, search: searchForm }}>
            <Head
                title={search ? `Search: ${search}` : 'Explore the community'}
            />
            <main className="wb-notebook wb-discovery wb-connected-discovery">
                <header className="wb-notebook-masthead">
                    <div>
                        <p className="wb-welcome-kicker">
                            Real people. Real progress.
                        </p>
                        <h1>Explore the community</h1>
                        <p>Connect. Discover. Build together.</p>
                    </div>
                    <div className="wb-globe-links">
                        <Link href="/topics#topics">
                            <Lightbulb />
                            Ideas
                        </Link>
                        <Link href="/topics?scope=people#topics">
                            <Users />
                            People
                        </Link>
                        <Link href="/topics/create">
                            <Sparkles />
                            Share knowledge
                        </Link>
                        <span>
                            Knowledge
                            <br />
                            connects people.
                        </span>
                    </div>
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
                                    placeholder="For example: Finding the first client for an AI service"
                                />
                                <button type="submit">
                                    Create topic
                                    <ArrowRight aria-hidden="true" />
                                </button>
                            </div>
                            <p id="new-topic-hint">
                                {auth.user
                                    ? 'Start with a title. Add your method on the next page.'
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
                                        view === 'latest' ? 'page' : undefined
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
                                <Link
                                    href={filterUrl('trending')}
                                    preserveState
                                    aria-current={
                                        view === 'trending' ? 'page' : undefined
                                    }
                                >
                                    <Flame aria-hidden="true" />
                                    Trending
                                </Link>
                                <Link
                                    href={filterUrl('saved')}
                                    preserveState
                                    aria-current={
                                        view === 'saved' ? 'page' : undefined
                                    }
                                >
                                    <Bookmark aria-hidden="true" />
                                    Most saved
                                </Link>
                            </nav>

                            {!emptyCommunity && (
                                <span className="wb-topic-count">
                                    {topics.total}{' '}
                                    {topics.total === 1 ? 'topic' : 'topics'}
                                </span>
                            )}
                        </div>
                        <Form
                            action="/topics#topics"
                            method="get"
                            options={{ preserveState: true }}
                            className="wb-discovery-filters"
                        >
                            <input type="hidden" name="q" value={search} />
                            <input type="hidden" name="view" value={view} />
                            <input
                                type="hidden"
                                name="category"
                                value={category}
                            />
                            <label>
                                <span className="sr-only">Filter by tag</span>
                                <select
                                    name="tag"
                                    aria-label="Filter by tag"
                                    defaultValue={tag}
                                    key={`tag:${tag}`}
                                    onChange={(event) =>
                                        event.currentTarget.form?.requestSubmit()
                                    }
                                >
                                    <option value="">All tags</option>
                                    {availableTags.map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                    {tag && !availableTags.includes(tag) && (
                                        <option value={tag}>{tag}</option>
                                    )}
                                </select>
                            </label>
                            <label>
                                <span className="sr-only">Sort topics</span>
                                <select
                                    name="sort"
                                    aria-label="Sort topics"
                                    defaultValue={sort}
                                    key={`sort:${sort}`}
                                    onChange={(event) =>
                                        event.currentTarget.form?.requestSubmit()
                                    }
                                >
                                    <option value="newest">Newest first</option>
                                    <option value="oldest">Oldest first</option>
                                    <option value="active">
                                        Recent activity
                                    </option>
                                </select>
                            </label>
                            {category && (
                                <Link
                                    href={`/topics?view=${view}#topics`}
                                    className="wb-filter-context"
                                >
                                    {categories[category]}{' '}
                                    <X className="size-3" />
                                    <span className="sr-only">
                                        Clear category
                                    </span>
                                </Link>
                            )}
                            {!guideOpen && (
                                <button type="button" onClick={toggleGuide}>
                                    Show guide
                                </button>
                            )}
                        </Form>
                        {view === 'trending' && (
                            <p className="wb-ranking-note">
                                Based on methods shared and topics saved in the
                                last 14 days.
                            </p>
                        )}
                        {view === 'saved' && (
                            <p className="wb-ranking-note">
                                Most saved by other members. Personal lists stay
                                private.
                            </p>
                        )}
                        <h2 id="topics-heading" className="sr-only">
                            {search
                                ? 'Search results'
                                : unanswered
                                  ? 'Topics waiting for a first method'
                                  : 'Latest from the community'}
                        </h2>
                        {search && scope !== 'people' && (
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

                        {scope === 'people' && people ? (
                            <div className="wb-people-results">
                                <p className="wb-ranking-note">
                                    {people.total}{' '}
                                    {people.total === 1 ? 'person' : 'people'}
                                    {search
                                        ? ` matching “${search}”`
                                        : ' in the community'}
                                </p>
                                {people.data.map((person) => (
                                    <article
                                        className="wb-person-card"
                                        key={person.id}
                                    >
                                        <MemberLink user={person} avatar />
                                        <p>@{person.username}</p>
                                        <span>
                                            {person.methods_count} methods ·{' '}
                                            {person.topics_count} topics
                                        </span>
                                        <Link
                                            href={`/members/${person.username}`}
                                        >
                                            View profile <ArrowRight />
                                        </Link>
                                    </article>
                                ))}
                                {people.data.length === 0 && (
                                    <div className="wb-empty">
                                        <Users className="wb-empty-icon" />
                                        <h3>No people found</h3>
                                        <p>Try a name or username.</p>
                                    </div>
                                )}
                                {people.last_page > 1 && (
                                    <nav
                                        className="wb-pagination"
                                        aria-label="People pagination"
                                    >
                                        {people.prev_page_url && (
                                            <Link href={people.prev_page_url}>
                                                Previous
                                            </Link>
                                        )}
                                        <span>
                                            Page {people.current_page} of{' '}
                                            {people.last_page}
                                        </span>
                                        {people.next_page_url && (
                                            <Link href={people.next_page_url}>
                                                Next
                                            </Link>
                                        )}
                                    </nav>
                                )}
                            </div>
                        ) : topics.data.length ? (
                            <div className="wb-entry-list">
                                {topics.data.map((topic) => (
                                    <TopicCard
                                        key={topic.id}
                                        topic={topic}
                                        categories={categories}
                                    />
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
                                    There are no topics yet. Share a useful AI
                                    workflow, a product you built, or how you
                                    found a paying client. Explain the steps,
                                    costs and what you learned.
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
                                    {search || category || tag || !unanswered
                                        ? 'No matching topics yet'
                                        : 'No topics are waiting for a first method'}
                                </h3>
                                <p>
                                    {search || category || tag || !unanswered
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

                        {scope !== 'people' && topics.last_page > 1 && (
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
                        {guideOpen && (
                            <div className="wb-connected-guide">
                                <button
                                    type="button"
                                    className="wb-guide-close"
                                    aria-label="Hide community guide"
                                    onClick={toggleGuide}
                                >
                                    <X />
                                </button>
                                <p className="wb-kicker">How Workbine works</p>
                                <h2
                                    id="guide-heading"
                                    className="wb-guide-heading"
                                >
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
                                                That’s a topic. Start one or
                                                explore what’s here.
                                            </p>
                                        </div>
                                    </li>
                                    <li>
                                        <span aria-hidden="true">02</span>
                                        <div>
                                            <strong>
                                                See how someone does it
                                            </strong>
                                            <p>
                                                That’s a method: practical steps
                                                you can try.
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
                                                What worked, what didn’t, or
                                                what you changed. That’s an
                                                experience.
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
                                        <dd>
                                            Finding the first client for an AI
                                            service
                                        </dd>
                                        <dt>Method</dt>
                                        <dd>
                                            Choose one type of business, ask
                                            about a repeated task, and offer a
                                            small paid pilot.
                                        </dd>
                                        <dt>Experience</dt>
                                        <dd>
                                            “One of four businesses agreed to a
                                            pilot. Setup took longer than
                                            expected, so next time I would
                                            narrow the scope.”
                                        </dd>
                                    </dl>
                                </details>
                                <Link
                                    href="/community/guide"
                                    className="wb-guide-link"
                                >
                                    Read the community guide{' '}
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </div>
                        )}
                        {!emptyCommunity && (
                            <div className="wb-starters">
                                <h3>Need a starting point?</h3>
                                <TopicStarters onChoose={chooseStarter} />
                            </div>
                        )}
                        <div className="wb-category-overview">
                            <h2>
                                <Flame />
                                Explore categories
                            </h2>
                            <p>Find something you want to try.</p>
                            {Object.entries(categories)
                                .sort(
                                    ([a], [b]) =>
                                        Number(categoryCounts[b] ?? 0) -
                                        Number(categoryCounts[a] ?? 0),
                                )
                                .slice(0, 5)
                                .map(([key, name]) => (
                                    <Link
                                        key={key}
                                        href={`/topics?category=${key}#topics`}
                                        preserveState
                                    >
                                        <span>{name}</span>
                                        {Number(categoryCounts[key] ?? 0) >
                                            0 && (
                                            <span>
                                                {categoryCounts[key]} topics
                                            </span>
                                        )}
                                        <ArrowRight />
                                    </Link>
                                ))}
                        </div>
                    </aside>
                </div>
            </main>
        </PublicShell>
    );
}
