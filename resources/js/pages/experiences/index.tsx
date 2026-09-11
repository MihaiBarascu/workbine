import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { MemberAvatar, MemberLink } from '@/components/community';
import { CopyLinkButton } from '@/components/copy-link-button';
import { ExperienceForm } from '@/components/experience-form';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import type {
    ExperienceOutcome,
    ExperienceSummary,
    PaginatedExperiences,
    User,
} from '@/types';
import '../../../css/topic-detail.css';

type Props = {
    topic: { id: number; title: string; slug: string };
    method: {
        id: number;
        title: string;
        user: { id: number; name: string; username: string };
    };
    experiences: PaginatedExperiences;
    ownExperience: ExperienceSummary | null;
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
    ownExperience,
    summary,
}: Props) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    const base = `/topics/${topic.slug}/methods/${method.id}`;
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
                            <MemberAvatar name={method.user.name} />
                            <p>
                                Method shared by{' '}
                                <MemberLink user={method.user} />
                            </p>
                        </div>
                        <CopyLinkButton path={`${base}/experiences`} />
                    </div>
                </header>

                <div className="wb-experiences-layout">
                    <div className="min-w-0">
                        <section
                            aria-label="Reported outcomes"
                            className="wb-outcome-summary"
                        >
                            {(Object.keys(outcomes) as ExperienceOutcome[]).map(
                                (outcome) => (
                                    <div key={outcome}>
                                        <p className="wb-outcome-count">
                                            {summary[outcome]}
                                        </p>
                                        <p>{outcomes[outcome]}</p>
                                    </div>
                                ),
                            )}
                        </section>
                        <p className="wb-detail-note wb-outcome-note">
                            Self-reported experiences, not independent
                            verification. Results depend on context. One
                            experience per person; updates replace their earlier
                            entry.
                        </p>

                        <section aria-labelledby="experiences-heading">
                            <div className="wb-detail-section-heading">
                                <div>
                                    <h2 id="experiences-heading">
                                        {experiences.total}{' '}
                                        {experiences.total === 1
                                            ? 'experience'
                                            : 'experiences'}
                                    </h2>
                                    <p>What happened when people tried it.</p>
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
                                    <h3>Tried it? Your context matters.</h3>
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
                                            <p className="wb-detail-body">
                                                {experience.body}
                                            </p>
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
                                ? 'Update your experience'
                                : 'Share your experience'}
                        </h2>
                        <p className="wb-experience-share-intro">
                            What did you try, and how did it go? Your context
                            helps the next person decide.
                        </p>
                        {!auth.user ? (
                            <Button asChild className="w-full">
                                <Link href={`${base}/experiences/create`}>
                                    Log in to share an experience
                                </Link>
                            </Button>
                        ) : isAuthor ? (
                            <p className="text-muted-foreground text-sm leading-6">
                                You shared this method. Experiences are for
                                other people who tried it, so you cannot
                                validate your own method.
                            </p>
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
