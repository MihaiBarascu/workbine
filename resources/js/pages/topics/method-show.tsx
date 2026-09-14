import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowUpRight, ExternalLink, Pencil } from 'lucide-react';
import { MemberAvatar, MemberLink } from '@/components/community';
import { MemberMessageLink } from '@/components/member-message-link';
import { PublicShell } from '@/components/public-shell';
import { ReportLink } from '@/components/report-link';
import { RichTextContent } from '@/components/rich-text-content';
import { ShareLinkButton } from '@/components/share-link-button';
import {
    MethodExperiences,
    type MethodExperienceProps,
} from '@/components/method-experiences';
import type { MethodSummary, User } from '@/types';
import '../../../css/topic-detail.css';

type Props = MethodExperienceProps & {
    topic: { id: number; title: string; slug: string };
    method: MethodSummary & { revision: string };
    canonicalUrl: string;
};

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('en', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(value));
}

export default function MethodShow({
    topic,
    method,
    canonicalUrl,
    ...experienceProps
}: Props) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    const methodUrl = `/topics/${topic.slug}/methods/${method.id}`;
    const description = method.body.replace(/\s+/g, ' ').trim().slice(0, 180);
    return (
        <PublicShell>
            <Head title={method.title}>
                <meta
                    name="description"
                    content={description}
                    head-key="description"
                />
                <link
                    rel="canonical"
                    href={canonicalUrl}
                    head-key="canonical"
                />
                <meta
                    property="og:title"
                    content={method.title}
                    head-key="og:title"
                />
                <meta
                    property="og:description"
                    content={description}
                    head-key="og:description"
                />
                <meta
                    property="og:url"
                    content={canonicalUrl}
                    head-key="og:url"
                />
                <meta property="og:type" content="article" head-key="og:type" />
            </Head>
            <main className="wb-detail-page wb-method-page">
                <Link href={`/topics/${topic.slug}`} className="wb-detail-back">
                    <ArrowLeft aria-hidden="true" />
                    {topic.title}
                </Link>
                <article
                    id={`method-${method.id}`}
                    aria-labelledby={`method-title-${method.id}`}
                    className="wb-method-article"
                >
                    <div className="wb-method-meta">
                        <div className="wb-detail-author">
                            <MemberAvatar
                                name={method.user.name}
                                src={method.user.avatar_url}
                            />
                            <div className="min-w-0">
                                <p>
                                    <MemberLink user={method.user} />
                                </p>
                                {method.created_at && (
                                    <time dateTime={method.created_at}>
                                        Shared {formatDate(method.created_at)}
                                    </time>
                                )}
                                {method.updated_at &&
                                    method.updated_at !== method.created_at && (
                                        <time dateTime={method.updated_at}>
                                            Updated{' '}
                                            {formatDate(method.updated_at)}
                                        </time>
                                    )}
                            </div>
                        </div>
                        <ShareLinkButton path={methodUrl} />
                    </div>
                    <h1 id={`method-title-${method.id}`}>{method.title}</h1>
                    <RichTextContent
                        document={method.body_document}
                        text={method.body}
                    />
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
                    {method.protected_at && (
                        <p className="text-muted-foreground mt-4 text-sm">
                            The original method is preserved because someone has
                            tried it.
                        </p>
                    )}
                    {!!method.updates?.length && (
                        <section
                            aria-label="Author updates"
                            className="mt-5 space-y-4 border-t pt-5"
                        >
                            <h4 className="font-semibold">
                                Updates from the author
                            </h4>
                            <p className="text-muted-foreground text-sm">
                                Separate from the original method. Earlier
                                experiences do not evaluate these updates.
                            </p>
                            <ol className="space-y-4">
                                {method.updates.map((update) => (
                                    <li
                                        key={update.id}
                                        id={`method-update-${update.id}`}
                                        className="border-l-2 pl-4"
                                    >
                                        <time
                                            dateTime={update.created_at}
                                            className="text-muted-foreground text-sm"
                                        >
                                            {formatDate(update.created_at)}
                                        </time>
                                        <p className="mt-2 [overflow-wrap:anywhere] whitespace-pre-wrap">
                                            {update.body}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}
                    <footer className="wb-method-footer">
                        {auth.user?.id === method.user.id && (
                            <Link
                                href={`/topics/${topic.slug}/methods/${method.id}/edit`}
                                title={
                                    method.protected_at
                                        ? 'Add an update'
                                        : 'Edit method'
                                }
                                className="inline-flex min-h-10 min-w-10 items-center justify-center"
                            >
                                <Pencil aria-hidden="true" />
                                <span
                                    className={
                                        method.protected_at
                                            ? undefined
                                            : 'sr-only'
                                    }
                                >
                                    {method.protected_at
                                        ? 'Add an update'
                                        : 'Edit method'}
                                </span>
                            </Link>
                        )}
                        <MemberMessageLink
                            memberId={method.user.id}
                            username={method.user.username}
                            context={{ type: 'method', id: method.id }}
                            label="Message author"
                            compact
                        />
                        <Link href="#experiences">
                            {method.experiences_count}{' '}
                            {method.experiences_count === 1
                                ? 'experience'
                                : 'experiences'}
                            <ArrowUpRight aria-hidden="true" />
                        </Link>
                        <ReportLink type="method" id={method.id} />
                    </footer>
                </article>
                <MethodExperiences
                    key={method.id}
                    base={methodUrl}
                    authorId={method.user.id}
                    methodRevision={method.revision}
                    {...experienceProps}
                />
            </main>
        </PublicShell>
    );
}
