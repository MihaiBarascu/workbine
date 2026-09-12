import { RichTextContent } from '@/components/rich-text-content';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { MemberAvatar, MemberLink } from '@/components/community';
import { CopyLinkButton } from '@/components/copy-link-button';
import { ExperienceForm } from '@/components/experience-form';
import { ReportLink } from '@/components/report-link';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import type {
    ExperienceOutcome,
    ExperienceSummary,
    PaginatedExperiences,
    PublicMember,
    User,
} from '@/types';
import '../../../css/topic-detail.css';

type Props = {
    topic: { id: number; title: string; slug: string };
    method: {
        id: number;
        title: string;
        user: PublicMember;
    };
    experiences: PaginatedExperiences;
    outcome: ExperienceOutcome | 'all';
    ownExperience: ExperienceSummary | null;
    ownExperienceHidden: boolean;
    summary: Record<ExperienceOutcome, number>;
};

const outcomes: Record<ExperienceOutcome, string> = {
    worked: 'Worked for me',
    partly: 'Partly worked',
    did_not_work: 'Did not work for me',
};

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(value));
}

export default function ExperiencesIndex({
    topic,
    method,
    experiences,
    outcome,
    ownExperience,
    ownExperienceHidden,
    summary,
}: Props) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    const base = `/topics/${topic.slug}/methods/${method.id}`;
    const experiencesUrl = `${base}/experiences`;
    const isAuthor = auth.user?.id === method.user.id;

    return (
        <PublicShell>
            <Head title={`Experiences - ${method.title}`} />
            <main className="wb-detail-page">
                <Link
                    href={`/topics/${topic.slug}#method-${method.id}`}
                    className="wb-detail-back"
                >
                    <ArrowLeft aria-hidden="true" />
                    Back to the method
                </Link>
                <header className="wb-experiences-heading">
                    <p className="wb-detail-label">After trying the method</p>
                    <h1>{method.title}</h1>
                    <p className="wb-experience-topic">
                        In{' '}
                        <Link href={`/topics/${topic.slug}`}>
                            {topic.title}
                        </Link>
                    </p>
                    <div className="wb-experience-heading-footer">
                        <div className="wb-detail-author">
                            <MemberAvatar
                                name={method.user.name}
                                src={method.user.avatar_url}
                            />
                            <p>
                                Method shared by{' '}
                                <MemberLink user={method.user} />
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <CopyLinkButton
                                path={
                                    outcome === 'all'
                                        ? experiencesUrl
                                        : `${experiencesUrl}?outcome=${outcome}`
                                }
                            />
                            <ReportLink type="method" id={method.id} />
                        </div>
                    </div>
                </header>

                <div className="wb-experiences-layout">
                    <div className="min-w-0">
                        <nav
                            aria-label="Filter experiences by outcome"
                            className="wb-outcome-summary"
                        >
                            {(Object.keys(outcomes) as ExperienceOutcome[]).map(
                                (value) => (
                                    <Link
                                        key={value}
                                        href={`${experiencesUrl}?outcome=${value}`}
                                        aria-current={
                                            outcome === value
                                                ? 'page'
                                                : undefined
                                        }
                                        aria-label={`${outcomes[value]}: ${summary[value]} ${summary[value] === 1 ? 'experience' : 'experiences'}`}
                                    >
                                        <p className="wb-outcome-count">
                                            {summary[value]}
                                        </p>
                                        <p>{outcomes[value]}</p>
                                    </Link>
                                ),
                            )}
                        </nav>
                        <p className="wb-detail-note wb-outcome-note">
                            Self-reported experiences, not independent
                            verification. Results depend on context. One
                            experience per person; updates replace their earlier
                            entry.
                        </p>

                        <section aria-labelledby="experiences-heading">
                            <Link
                                href={experiencesUrl}
                                aria-current={
                                    outcome === 'all' ? 'page' : undefined
                                }
                                className="text-primary mb-3 inline-flex min-h-10 items-center rounded-md text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
                            >
                                All experiences
                            </Link>
                            <div className="wb-detail-section-heading">
                                <div>
                                    <h2 id="experiences-heading">
                                        {experiences.total}{' '}
                                        {experiences.total === 1
                                            ? 'experience'
                                            : 'experiences'}
                                    </h2>
                                    <p role="status">
                                        {outcome === 'all'
                                            ? 'What happened when people tried it.'
                                            : `Showing: ${outcomes[outcome]}.`}
                                    </p>
                                </div>
                                {!isAuthor && (
                                    <Button asChild size="sm" variant="outline">
                                        {auth.user ? (
                                            <a href="#share">
                                                {ownExperience
                                                    ? 'Edit my experience'
                                                    : 'I tried this'}
                                            </a>
                                        ) : (
                                            <Link
                                                href={`${base}/experiences/create`}
                                            >
                                                I tried this
                                            </Link>
                                        )}
                                    </Button>
                                )}
                            </div>
                            {experiences.data.length === 0 ? (
                                <div className="wb-detail-empty">
                                    <h3>
                                        {outcome === 'all'
                                            ? 'Tried it? Your context matters.'
                                            : 'No experiences with this outcome yet.'}
                                    </h3>
                                    <p>
                                        Share what happened, even when it only
                                        partly worked or did not help. An honest
                                        limitation can save someone time.
                                    </p>
                                </div>
                            ) : (
                                <div className="wb-experience-list">
                                    {experiences.data.map((experience) => (
                                        <article
                                            key={experience.id}
                                            id={`experience-${experience.id}`}
                                            className="wb-experience-article"
                                        >
                                            <div className="wb-experience-meta">
                                                <div className="wb-detail-author">
                                                    <MemberAvatar
                                                        name={
                                                            experience.user.name
                                                        }
                                                        src={
                                                            experience.user
                                                                .avatar_url
                                                        }
                                                    />
                                                    <div className="min-w-0">
                                                        <h3>
                                                            <MemberLink
                                                                user={
                                                                    experience.user
                                                                }
                                                            />
                                                        </h3>
                                                        {experience.updated_at && (
                                                            <p className="wb-experience-date">
                                                                Last shared{' '}
                                                                <time
                                                                    dateTime={
                                                                        experience.updated_at
                                                                    }
                                                                >
                                                                    {formatDate(
                                                                        experience.updated_at,
                                                                    )}
                                                                </time>
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="wb-experience-outcome">
                                                    {
                                                        outcomes[
                                                            experience.outcome
                                                        ]
                                                    }
                                                </span>
                                            </div>
                                            <RichTextContent
                                                document={
                                                    experience.body_document
                                                }
                                                text={experience.body}
                                            />
                                            {experience.evidence_image && (
                                                <a
                                                    href={
                                                        experience
                                                            .evidence_image.url
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="focus-visible:ring-ring mt-5 block w-fit max-w-full overflow-hidden rounded-lg border focus-visible:ring-2"
                                                >
                                                    <img
                                                        src={
                                                            experience
                                                                .evidence_image
                                                                .url
                                                        }
                                                        alt={`Evidence shared by ${experience.user.name}`}
                                                        width={
                                                            experience
                                                                .evidence_image
                                                                .width
                                                        }
                                                        height={
                                                            experience
                                                                .evidence_image
                                                                .height
                                                        }
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="bg-muted max-h-96 max-w-full object-contain"
                                                    />
                                                    <span className="sr-only">
                                                        Open image in a new tab
                                                    </span>
                                                </a>
                                            )}
                                            {experience.tried_on && (
                                                <p className="wb-experience-tried">
                                                    Tried on{' '}
                                                    <time
                                                        dateTime={
                                                            experience.tried_on
                                                        }
                                                    >
                                                        {formatDate(
                                                            experience.tried_on,
                                                        )}
                                                    </time>
                                                </p>
                                            )}
                                            {experience.evidence_url && (
                                                <a
                                                    href={
                                                        experience.evidence_url
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer nofollow ugc"
                                                    className="wb-detail-text-link wb-experience-evidence"
                                                >
                                                    View shared evidence
                                                    <ExternalLink aria-hidden="true" />
                                                    <span className="sr-only">
                                                        (opens in a new tab)
                                                    </span>
                                                </a>
                                            )}
                                            <div className="mt-4">
                                                <ReportLink
                                                    type="experience"
                                                    id={experience.id}
                                                />
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                            {experiences.last_page > 1 && (
                                <nav
                                    aria-label="Experience pagination"
                                    className="wb-experience-pagination"
                                >
                                    <Button
                                        asChild={Boolean(
                                            experiences.prev_page_url,
                                        )}
                                        variant="outline"
                                        disabled={!experiences.prev_page_url}
                                    >
                                        {experiences.prev_page_url ? (
                                            <Link
                                                href={experiences.prev_page_url}
                                            >
                                                Previous
                                            </Link>
                                        ) : (
                                            <span>Previous</span>
                                        )}
                                    </Button>
                                    <span>
                                        Page {experiences.current_page} of{' '}
                                        {experiences.last_page}
                                    </span>
                                    <Button
                                        asChild={Boolean(
                                            experiences.next_page_url,
                                        )}
                                        variant="outline"
                                        disabled={!experiences.next_page_url}
                                    >
                                        {experiences.next_page_url ? (
                                            <Link
                                                href={experiences.next_page_url}
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
                    </div>
                    <section
                        id="share"
                        tabIndex={-1}
                        aria-labelledby="share-heading"
                        className="wb-experience-share"
                    >
                        <h2 id="share-heading">
                            {ownExperience
                                ? 'Update your response'
                                : 'Tried this method?'}
                        </h2>
                        <p className="wb-experience-share-intro">
                            What did you try, and how did it go? Your context
                            helps the next person decide.
                        </p>
                        {!auth.user ? (
                            <Button asChild className="w-full">
                                <Link href={`${base}/experiences/create`}>
                                    Log in to share how it went
                                </Link>
                            </Button>
                        ) : isAuthor ? (
                            <p className="text-muted-foreground text-sm leading-6">
                                You shared this method. Experiences are for
                                other people who tried it, so you cannot
                                validate your own method.
                            </p>
                        ) : ownExperienceHidden ? (
                            <div className="space-y-4">
                                <p className="text-muted-foreground text-sm leading-6">
                                    Your experience is hidden following
                                    moderation. You can still remove it.
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                'Remove your experience? This cannot be undone.',
                                            )
                                        )
                                            router.delete(
                                                `${base}/experience`,
                                                { preserveScroll: true },
                                            );
                                    }}
                                >
                                    Remove my response
                                </Button>
                            </div>
                        ) : (
                            <ExperienceForm
                                action={`${base}/experience`}
                                experience={ownExperience}
                            />
                        )}
                    </section>
                </div>
            </main>
        </PublicShell>
    );
}
