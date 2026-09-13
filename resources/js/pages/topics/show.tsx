import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUpRight,
    Pencil,
    Plus,
} from 'lucide-react';
import { MemberAvatar, MemberLink } from '@/components/community';
import { LikeTopicButton } from '@/components/topic-card';
import { ShareLinkButton } from '@/components/share-link-button';
import { PublicShell } from '@/components/public-shell';
import { ReportLink } from '@/components/report-link';
import { SaveTopicButton } from '@/components/save-topic-button';
import { Button } from '@/components/ui/button';
import type { PaginatedMethods, TopicSummary, User } from '@/types';
import '../../../css/topic-detail.css';

type Props = { topic: TopicSummary; methods: PaginatedMethods; saved: boolean };

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('en', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(value));
}

export default function TopicShow({ topic, methods, saved }: Props) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    useEffect(() => {
        const openLegacyLink = () => {
            const method = window.location.hash.match(/^#method-(\d+)$/);
            const update = window.location.hash.match(/^#method-update-(\d+)$/);
            if (method)
                router.visit(`/topics/${topic.slug}/methods/${method[1]}`, {
                    replace: true,
                });
            else if (update)
                window.location.replace(
                    `/topics/${topic.slug}/method-updates/${update[1]}`,
                );
        };
        openLegacyLink();
        window.addEventListener('hashchange', openLegacyLink);
        return () => window.removeEventListener('hashchange', openLegacyLink);
    }, [topic.slug]);
    const contributionUrl = `/topics/${topic.slug}/methods/create`;

    return (
        <PublicShell>
            <Head title={topic.title} />
            <main className="wb-detail-page">
                <Link href="/topics#topics" className="wb-detail-back">
                    <ArrowLeft aria-hidden="true" />
                    All topics
                </Link>

                <div className="wb-topic-layout">
                    <div className="min-w-0">
                        <header className="wb-topic-heading">
                            <p className="wb-detail-label">Topic</p>
                            <h1>{topic.title}</h1>
                            <div className="wb-detail-author">
                                <MemberAvatar
                                    name={topic.user.name}
                                    src={topic.user.avatar_url}
                                />
                                <div className="min-w-0">
                                    <p>
                                        Started by{' '}
                                        <MemberLink user={topic.user} />
                                    </p>
                                    {topic.created_at && (
                                        <time dateTime={topic.created_at}>
                                            {formatDate(topic.created_at)}
                                        </time>
                                    )}
                                    {topic.updated_at &&
                                        topic.updated_at !==
                                            topic.created_at && (
                                            <time dateTime={topic.updated_at}>
                                                Updated{' '}
                                                {formatDate(topic.updated_at)}
                                            </time>
                                        )}
                                </div>
                            </div>
                            {topic.description && (
                                <p className="wb-detail-context">
                                    {topic.description}
                                </p>
                            )}
                            <div className="wb-topic-tools">
                                <a href="#methods-heading">
                                    {topic.methods_count}{' '}
                                    {topic.methods_count === 1
                                        ? 'method shared'
                                        : 'methods shared'}
                                    <ArrowDown aria-hidden="true" />
                                </a>
                                <ShareLinkButton
                                    path={`/topics/${topic.slug}`}
                                />
                                <ReportLink type="topic" id={topic.id} />
                                <LikeTopicButton topic={topic} />
                                <SaveTopicButton
                                    topicSlug={topic.slug}
                                    saved={saved}
                                    authenticated={Boolean(auth.user)}
                                />
                                {auth.user?.id === topic.user.id && (
                                    <Link
                                        href={`/topics/${topic.slug}/edit`}
                                        title="Edit topic"
                                        className="min-h-10 min-w-10 justify-center"
                                    >
                                        <Pencil aria-hidden="true" />
                                        <span className="sr-only">
                                            Edit topic
                                        </span>
                                    </Link>
                                )}
                            </div>
                            <p className="text-muted-foreground mt-3 text-sm leading-6">
                                {topic.saves_count}{' '}
                                {topic.saves_count === 1 ? 'person' : 'people'}{' '}
                                saved this topic{' '}
                                <span className="text-xs">
                                    (excluding the author)
                                </span>
                            </p>
                        </header>

                        <section
                            aria-labelledby="methods-heading"
                            className="wb-methods-section"
                        >
                            <div className="wb-detail-section-heading">
                                <div>
                                    <h2 id="methods-heading">
                                        What worked for people
                                    </h2>
                                    <p>
                                        {methods.data.length > 0
                                            ? 'Different approaches, shared from experience. Newest first.'
                                            : 'Every useful topic starts with one approach.'}
                                    </p>
                                </div>
                                <Button asChild>
                                    <Link href={contributionUrl}>
                                        <Plus aria-hidden="true" />
                                        Create a method
                                    </Link>
                                </Button>
                            </div>
                            {methods.data.length > 0 ? (
                                <div className="wb-method-list">
                                    {methods.data.map((method) => (
                                        <article
                                            key={method.id}
                                            id={`method-${method.id}`}
                                            aria-labelledby={`method-title-${method.id}`}
                                            className="wb-method-article wb-method-preview"
                                        >
                                            <div className="wb-method-meta">
                                                <div className="wb-detail-author">
                                                    <MemberAvatar
                                                        name={method.user.name}
                                                        src={
                                                            method.user
                                                                .avatar_url
                                                        }
                                                    />
                                                    <div className="min-w-0">
                                                        <MemberLink
                                                            user={method.user}
                                                        />
                                                        {method.created_at && (
                                                            <time
                                                                dateTime={
                                                                    method.created_at
                                                                }
                                                            >
                                                                {formatDate(
                                                                    method.created_at,
                                                                )}
                                                            </time>
                                                        )}
                                                    </div>
                                                </div>
                                                <ShareLinkButton
                                                    path={`/topics/${topic.slug}/methods/${method.id}`}
                                                />
                                            </div>
                                            <h3
                                                id={`method-title-${method.id}`}
                                            >
                                                <Link
                                                    href={`/topics/${topic.slug}/methods/${method.id}`}
                                                >
                                                    {method.title}
                                                </Link>
                                            </h3>
                                            <p className="wb-method-excerpt">
                                                {method.body}
                                            </p>
                                            <footer className="wb-method-footer">
                                                <Link
                                                    href={`/topics/${topic.slug}/methods/${method.id}/experiences`}
                                                >
                                                    {method.experiences_count}{' '}
                                                    {method.experiences_count ===
                                                    1
                                                        ? 'experience'
                                                        : 'experiences'}
                                                </Link>
                                                {!!method.worked_count && (
                                                    <span className="text-muted-foreground text-sm">
                                                        {method.worked_count}{' '}
                                                        worked
                                                    </span>
                                                )}
                                                {!!method.partly_count && (
                                                    <span className="text-muted-foreground text-sm">
                                                        {method.partly_count}{' '}
                                                        partly worked
                                                    </span>
                                                )}
                                                <Link
                                                    href={`/topics/${topic.slug}/methods/${method.id}`}
                                                    aria-label={`Read method: ${method.title}`}
                                                    className="ml-auto"
                                                >
                                                    <ArrowUpRight aria-hidden="true" />
                                                </Link>
                                            </footer>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="wb-detail-empty">
                                    <p className="wb-detail-label">
                                        Be the first to share
                                    </p>
                                    <h3>
                                        Your experience could be the starting
                                        point
                                    </h3>
                                    <p>
                                        Describe the approach you tried, the
                                        steps you took, and what happened. It
                                        does not have to be the perfect answer
                                        to help someone.
                                    </p>
                                    <Button asChild className="mt-6">
                                        <Link href={contributionUrl}>
                                            Create the first method
                                            <ArrowUpRight aria-hidden="true" />
                                        </Link>
                                    </Button>
                                </div>
                            )}
                            {methods.last_page > 1 && (
                                <nav
                                    aria-label="Method pagination"
                                    className="mt-6 flex items-center justify-between gap-4"
                                >
                                    <Button
                                        asChild={Boolean(methods.prev_page_url)}
                                        variant="outline"
                                        disabled={!methods.prev_page_url}
                                    >
                                        {methods.prev_page_url ? (
                                            <Link href={methods.prev_page_url}>
                                                <ArrowLeft aria-hidden="true" />
                                                Previous
                                            </Link>
                                        ) : (
                                            <span>
                                                <ArrowLeft aria-hidden="true" />
                                                Previous
                                            </span>
                                        )}
                                    </Button>
                                    <span className="text-muted-foreground text-sm">
                                        {methods.current_page} /{' '}
                                        {methods.last_page}
                                    </span>
                                    <Button
                                        asChild={Boolean(methods.next_page_url)}
                                        variant="outline"
                                        disabled={!methods.next_page_url}
                                    >
                                        {methods.next_page_url ? (
                                            <Link href={methods.next_page_url}>
                                                Next
                                                <ArrowRight aria-hidden="true" />
                                            </Link>
                                        ) : (
                                            <span>
                                                Next
                                                <ArrowRight aria-hidden="true" />
                                            </span>
                                        )}
                                    </Button>
                                </nav>
                            )}
                        </section>
                    </div>
                    <aside
                        aria-label="Contribution guidance"
                        className="wb-topic-aside"
                    >
                        <section className="wb-topic-guidance">
                            <h2>Have another way?</h2>
                            <p>
                                Share what worked in your situation. The small
                                details often make the difference.
                            </p>
                            <ul>
                                <li>The context and the steps you took</li>
                                <li>What worked, and what did not</li>
                                <li>A source, if you learned it elsewhere</li>
                            </ul>
                            <Button asChild variant="outline">
                                <Link href={contributionUrl}>
                                    Add your approach
                                    <ArrowUpRight aria-hidden="true" />
                                </Link>
                            </Button>
                        </section>
                        <p className="wb-detail-note">
                            Saves help members return to a topic. Experiences
                            describe what happened when they tried a method.{' '}
                            Methods and experiences are self-reported, not
                            independently verified results.
                        </p>
                    </aside>
                </div>
            </main>
        </PublicShell>
    );
}
