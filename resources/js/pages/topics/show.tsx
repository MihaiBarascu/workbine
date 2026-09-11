import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ExternalLink,
    Lightbulb,
    Link2,
    MessageSquareText,
    Plus,
} from 'lucide-react';
import { CopyLinkButton } from '@/components/copy-link-button';
import { MemberLink } from '@/components/community';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import type { MethodSummary, TopicSummary, User } from '@/types';

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
            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
                <Button asChild variant="ghost" className="mb-6 -ml-3">
                    <Link href="/topics#topics">
                        <ArrowLeft aria-hidden="true" />
                        All topics
                    </Link>
                </Button>
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="min-w-0">
                        <p className="text-primary dark:text-primary text-sm font-medium">
                            A topic to explore
                        </p>
                        <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-[-0.03em] text-balance [overflow-wrap:anywhere] sm:text-4xl lg:text-5xl">
                            {topic.title}
                        </h1>
                        <div className="text-muted-foreground mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm [overflow-wrap:anywhere]">
                            <span className="inline-flex flex-wrap items-center gap-1">
                                Started by <MemberLink user={topic.user} />
                            </span>
                            {topic.created_at && (
                                <time dateTime={topic.created_at}>
                                    · {formatDate(topic.created_at)}
                                </time>
                            )}
                        </div>
                        {topic.description && (
                            <p className="text-muted-foreground mt-6 text-base leading-8 [overflow-wrap:anywhere] whitespace-pre-wrap sm:text-lg">
                                {topic.description}
                            </p>
                        )}
                        <div className="mt-5">
                            <CopyLinkButton path={`/topics/${topic.slug}`} />
                        </div>

                        <section
                            aria-labelledby="methods-heading"
                            className="mt-10 border-t pt-8"
                        >
                            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2
                                        id="methods-heading"
                                        className="text-2xl font-semibold tracking-tight"
                                    >
                                        What worked for people
                                    </h2>
                                    <p className="text-muted-foreground mt-1 text-sm">
                                        {topic.methods_count}{' '}
                                        {topic.methods_count === 1
                                            ? 'method shared'
                                            : 'methods shared'}
                                        {topic.methods_count > 0
                                            ? ' · Newest first'
                                            : ''}
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
                                <div className="space-y-6">
                                    {methods.map((method) => (
                                        <article
                                            key={method.id}
                                            id={`method-${method.id}`}
                                            aria-labelledby={`method-title-${method.id}`}
                                            className="bg-card scroll-mt-36 rounded-2xl border p-5 sm:p-6"
                                        >
                                            <div className="mb-5 flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-muted-foreground text-sm [overflow-wrap:anywhere]">
                                                        Shared by{' '}
                                                        <MemberLink
                                                            user={method.user}
                                                        />
                                                    </p>
                                                    {method.created_at && (
                                                        <time
                                                            dateTime={
                                                                method.created_at
                                                            }
                                                            className="text-muted-foreground mt-1 block text-xs"
                                                        >
                                                            {formatDate(
                                                                method.created_at,
                                                            )}
                                                        </time>
                                                    )}
                                                </div>
                                                <a
                                                    href={`#method-${method.id}`}
                                                    aria-label={`Link to method: ${method.title}`}
                                                    className="text-muted-foreground hover:bg-muted focus-visible:ring-ring shrink-0 rounded-md p-2 focus-visible:ring-2 focus-visible:outline-none"
                                                >
                                                    <Link2
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                </a>
                                            </div>
                                            <h3
                                                id={`method-title-${method.id}`}
                                                className="text-xl leading-7 font-semibold tracking-tight [overflow-wrap:anywhere]"
                                            >
                                                {method.title}
                                            </h3>
                                            <p className="text-foreground/90 mt-4 text-base leading-8 [overflow-wrap:anywhere] whitespace-pre-wrap">
                                                {method.body}
                                            </p>
                                            {method.source_url && (
                                                <div className="mt-6 border-t pt-4">
                                                    <a
                                                        href={method.source_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer nofollow ugc"
                                                        className="focus-visible:ring-ring text-primary dark:text-primary inline-flex items-center gap-2 rounded-sm text-sm font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
                                                    >
                                                        Original source
                                                        <ExternalLink
                                                            className="size-4"
                                                            aria-hidden="true"
                                                        />
                                                        <span className="sr-only">
                                                            (opens in a new tab)
                                                        </span>
                                                    </a>
                                                    <p className="text-muted-foreground mt-2 text-xs leading-5 [overflow-wrap:anywhere]">
                                                        {method.source_url}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                                                <Link
                                                    href={`/topics/${topic.slug}/methods/${method.id}/experiences`}
                                                    className="text-primary dark:text-primary text-sm font-medium underline underline-offset-4"
                                                >
                                                    {method.experiences_count}{' '}
                                                    {method.experiences_count ===
                                                    1
                                                        ? 'experience'
                                                        : 'experiences'}
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
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-muted/50 dark:bg-muted/50 rounded-2xl border border-dashed px-6 py-12 text-center">
                                    <MessageSquareText
                                        className="text-primary dark:text-primary mx-auto size-9"
                                        aria-hidden="true"
                                    />
                                    <h3 className="mt-4 text-xl font-semibold">
                                        Your experience could be the starting
                                        point
                                    </h3>
                                    <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-6">
                                        Describe the approach you tried, the
                                        steps you took, the result, and what you
                                        would do differently next time.
                                    </p>
                                    <Button asChild className="mt-6">
                                        <Link href={contributionUrl}>
                                            Share the first method
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </section>
                    </div>
                    <aside aria-label="Contribution guidance">
                        <div className="bg-muted/50 dark:bg-muted/50 rounded-2xl border p-6 lg:sticky lg:top-24">
                            <Lightbulb
                                className="text-primary dark:text-primary mb-4 size-6"
                                aria-hidden="true"
                            />
                            <h2 className="text-lg font-semibold">
                                Help someone try it tomorrow.
                            </h2>
                            <p className="text-muted-foreground mt-3 text-sm leading-6">
                                A useful method explains the situation, the
                                steps, and the result. Mention what did not
                                work, too.
                            </p>
                            <p className="text-muted-foreground mt-3 text-sm leading-6">
                                Learned it from someone else? Include the
                                source. Tried a method here? Share your result
                                so the next person has more context.
                            </p>
                            <p className="text-muted-foreground mt-3 text-xs leading-5">
                                Methods and experiences are self-reported, not
                                independently verified results.
                            </p>
                            <Button
                                asChild
                                variant="outline"
                                className="mt-5 w-full"
                            >
                                <Link href={contributionUrl}>
                                    Add your approach
                                </Link>
                            </Button>
                        </div>
                    </aside>
                </div>
            </main>
        </PublicShell>
    );
}
