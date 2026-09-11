import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowLeft,
    ArrowUpRight,
    ExternalLink,
    Link2,
    Plus,
} from 'lucide-react';
import { MemberAvatar, MemberLink } from '@/components/community';
import { CopyLinkButton } from '@/components/copy-link-button';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import type { MethodSummary, TopicSummary, User } from '@/types';
import '../../../css/topic-detail.css';

type Props = { topic: TopicSummary; methods: MethodSummary[] };

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('en', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(value));
}

export default function TopicShow({ topic, methods }: Props) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;
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
                                <MemberAvatar name={topic.user.name} />
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
                                <CopyLinkButton
                                    path={`/topics/${topic.slug}`}
                                />
                            </div>
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
                                        {methods.length > 0
                                            ? 'Different approaches, shared from experience. Newest first.'
                                            : 'Every useful topic starts with one approach.'}
                                    </p>
                                </div>
                                <Button asChild>
                                    <Link href={contributionUrl}>
                                        <Plus aria-hidden="true" />
                                        Share a method
                                    </Link>
                                </Button>
                            </div>
                            {methods.length > 0 ? (
                                <div className="wb-method-list">
                                    {methods.map((method) => (
                                        <article
                                            key={method.id}
                                            id={`method-${method.id}`}
                                            aria-labelledby={`method-title-${method.id}`}
                                            className="wb-method-article"
                                        >
                                            <div className="wb-method-meta">
                                                <div className="wb-detail-author">
                                                    <MemberAvatar
                                                        name={method.user.name}
                                                    />
                                                    <div className="min-w-0">
                                                        <p>
                                                            <MemberLink
                                                                user={
                                                                    method.user
                                                                }
                                                            />
                                                        </p>
                                                        {method.created_at && (
                                                            <time
                                                                dateTime={
                                                                    method.created_at
                                                                }
                                                            >
                                                                Shared{' '}
                                                                {formatDate(
                                                                    method.created_at,
                                                                )}
                                                            </time>
                                                        )}
                                                    </div>
                                                </div>
                                                <a
                                                    href={`#method-${method.id}`}
                                                    aria-label={`Link to method: ${method.title}`}
                                                    className="wb-method-permalink"
                                                >
                                                    <Link2 aria-hidden="true" />
                                                </a>
                                            </div>
                                            <h3
                                                id={`method-title-${method.id}`}
                                            >
                                                {method.title}
                                            </h3>
                                            <p className="wb-detail-body">
                                                {method.body}
                                            </p>
                                            {method.source_url && (
                                                <div className="wb-method-source">
                                                    <a
                                                        href={method.source_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer nofollow ugc"
                                                    >
                                                        Original source
                                                        <ExternalLink aria-hidden="true" />
                                                        <span className="sr-only">
                                                            (opens in a new tab)
                                                        </span>
                                                    </a>
                                                    <p>{method.source_url}</p>
                                                </div>
                                            )}
                                            <footer className="wb-method-footer">
                                                <Link
                                                    href={`/topics/${topic.slug}/methods/${method.id}/experiences`}
                                                >
                                                    {method.experiences_count}{' '}
                                                    {method.experiences_count ===
                                                    1
                                                        ? 'experience'
                                                        : 'experiences'}
                                                    <ArrowUpRight aria-hidden="true" />
                                                </Link>
                                                {auth.user?.id !==
                                                    method.user.id && (
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        <Link
                                                            href={`/topics/${topic.slug}/methods/${method.id}/experiences/create`}
                                                        >
                                                            I tried this
                                                        </Link>
                                                    </Button>
                                                )}
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
                                            Share the first method
                                            <ArrowUpRight aria-hidden="true" />
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </section>
                    </div>
                    <aside
                        aria-label="Contribution guidance"
                        className="wb-topic-aside"
                    >
                        {methods.length > 0 && (
                            <nav aria-label="Methods in this topic">
                                <h2>In this topic</h2>
                                <ol className="wb-method-index">
                                    {methods
                                        .slice(0, 6)
                                        .map((method, index) => (
                                            <li key={method.id}>
                                                <a
                                                    href={`#method-${method.id}`}
                                                >
                                                    <span aria-hidden="true">
                                                        {index + 1}
                                                    </span>
                                                    <span>{method.title}</span>
                                                </a>
                                            </li>
                                        ))}
                                </ol>
                                {methods.length > 6 && (
                                    <a
                                        href="#methods-heading"
                                        className="wb-detail-text-link"
                                    >
                                        See all {methods.length} methods
                                    </a>
                                )}
                            </nav>
                        )}
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
                            Methods and experiences are self-reported, not
                            independently verified results.
                        </p>
                    </aside>
                </div>
            </main>
        </PublicShell>
    );
}
