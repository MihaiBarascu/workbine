import { Form, Link, usePage } from '@inertiajs/react';
import { ExternalLink, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MemberAvatar, MemberLink } from '@/components/community';
import { ExperienceForm } from '@/components/experience-form';
import InputError from '@/components/input-error';
import { MemberMessageLink } from '@/components/member-message-link';
import { ReportLink } from '@/components/report-link';
import { RichTextContent } from '@/components/rich-text-content';
import { Button } from '@/components/ui/button';
import type {
    ExperienceOutcome,
    OwnExperience,
    PaginatedExperiences,
    User,
} from '@/types';

export type MethodExperienceProps = {
    experiences: PaginatedExperiences;
    outcome: ExperienceOutcome | 'all';
    ownExperience: OwnExperience | null;
    ownExperienceHidden: boolean;
    ownExperienceHiddenRevision: string | null;
    summary: Record<ExperienceOutcome, number>;
};

type Props = MethodExperienceProps & {
    base: string;
    authorId: number;
    methodRevision: string;
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

export function MethodExperiences({
    base,
    authorId,
    methodRevision,
    experiences,
    outcome,
    ownExperience,
    ownExperienceHidden,
    ownExperienceHiddenRevision,
    summary,
}: Props) {
    const {
        props: { auth },
        url,
    } = usePage<{ auth: { user: User | null } }>();
    const isAuthor = auth.user?.id === authorId;
    const triggerRef = useRef<HTMLAnchorElement>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [hiddenRevision, setHiddenRevision] = useState(
        ownExperienceHiddenRevision,
    );
    const total = summary.worked + summary.partly + summary.did_not_work;
    useEffect(() => {
        const openFromHash = () => {
            if (window.location.hash !== '#share') return;
            setFormOpen(true);
            requestAnimationFrame(() =>
                document
                    .getElementById('share')
                    ?.scrollIntoView({ block: 'start' }),
            );
        };
        openFromHash();
        window.addEventListener('hashchange', openFromHash);
        return () => window.removeEventListener('hashchange', openFromHash);
    }, [url]);

    return (
        <section
            id="experiences"
            aria-labelledby="experiences-heading"
            className="wb-method-experiences"
        >
            <div className="wb-detail-section-heading">
                <div>
                    <h2 id="experiences-heading">
                        {experiences.total}{' '}
                        {experiences.total === 1 ? 'experience' : 'experiences'}
                    </h2>
                    <p role="status">
                        {outcome === 'all'
                            ? 'What happened when people tried it.'
                            : `Showing: ${outcomes[outcome]}.`}
                    </p>
                </div>
                {!isAuthor && (
                    <Button asChild size="sm">
                        {auth.user ? (
                            <a
                                href="#share"
                                ref={triggerRef}
                                onClick={() => setFormOpen(true)}
                                aria-expanded={formOpen}
                                aria-controls="share"
                            >
                                {ownExperience || ownExperienceHidden
                                    ? 'Edit my experience'
                                    : 'I tried this'}
                            </a>
                        ) : (
                            <Link href={`${base}/experiences/create`}>
                                I tried this
                            </Link>
                        )}
                    </Button>
                )}
            </div>
            {(total > 0 || outcome !== 'all') && (
                <nav
                    aria-label="Filter experiences by outcome"
                    className="wb-experience-filters"
                >
                    <Link
                        href={`${base}#experiences`}
                        preserveScroll
                        preserveState
                        aria-label="All experiences"
                        aria-current={outcome === 'all' ? 'page' : undefined}
                    >
                        All experiences <span aria-hidden="true">{total}</span>
                    </Link>
                    {(Object.keys(outcomes) as ExperienceOutcome[]).map(
                        (value) => (
                            <Link
                                key={value}
                                href={`${base}?outcome=${value}#experiences`}
                                preserveScroll
                                preserveState
                                aria-current={
                                    outcome === value ? 'page' : undefined
                                }
                                aria-label={`${outcomes[value]}: ${summary[value]} ${summary[value] === 1 ? 'experience' : 'experiences'}`}
                            >
                                {outcomes[value]}{' '}
                                <span aria-hidden="true">{summary[value]}</span>
                            </Link>
                        ),
                    )}
                </nav>
            )}
            <div
                id="share"
                hidden={!formOpen}
                className="wb-experience-share mb-6"
                aria-labelledby="share-heading"
            >
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <h2 id="share-heading">
                            {ownExperience
                                ? 'Update your response'
                                : 'Tried this method?'}
                        </h2>
                        <p className="text-muted-foreground mt-2 text-sm">
                            What did you try, and how did it go?
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Close response form"
                        onClick={() => {
                            setFormOpen(false);
                            triggerRef.current?.focus();
                        }}
                    >
                        <X aria-hidden="true" />
                    </Button>
                </div>
                {!auth.user ? (
                    <Button asChild>
                        <Link href={`${base}/experiences/create`}>
                            Log in to share how it went
                        </Link>
                    </Button>
                ) : isAuthor ? (
                    <p className="text-muted-foreground text-sm">
                        You shared this method. Experiences are for other people
                        who tried it.
                    </p>
                ) : hiddenRevision ? (
                    <div className="space-y-4">
                        <p className="text-muted-foreground text-sm">
                            Your experience is hidden following moderation. You
                            can still remove it.
                        </p>
                        <Form
                            action={`${base}/experience`}
                            method="delete"
                            disableWhileProcessing
                            onSuccess={() => setHiddenRevision(null)}
                            onBefore={(visit) =>
                                visit.method !== 'delete' ||
                                window.confirm(
                                    'Remove your experience? This cannot be undone.',
                                )
                            }
                        >
                            {({ errors, processing }) => (
                                <div className="space-y-3">
                                    <input
                                        type="hidden"
                                        name="experience_revision"
                                        value={hiddenRevision}
                                    />
                                    {errors.experience_revision && (
                                        <div role="alert">
                                            <InputError
                                                message={
                                                    errors.experience_revision
                                                }
                                            />
                                            <a
                                                href={`${base}#share`}
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    window.location.reload();
                                                }}
                                                className="text-primary text-sm underline"
                                            >
                                                Reload the latest response
                                                before trying again
                                            </a>
                                        </div>
                                    )}
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        disabled={processing}
                                    >
                                        Remove my response
                                    </Button>
                                </div>
                            )}
                        </Form>
                    </div>
                ) : (
                    <ExperienceForm
                        key={base}
                        action={`${base}/experience`}
                        methodRevision={methodRevision}
                        experience={ownExperience}
                    />
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
                        Share what happened, even when it only partly worked or
                        did not help. An honest limitation can save someone
                        time.
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
                                        name={experience.user.name}
                                        src={experience.user.avatar_url}
                                    />
                                    <div className="min-w-0">
                                        <h3>
                                            <MemberLink
                                                user={experience.user}
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
                                    {outcomes[experience.outcome]}
                                </span>
                            </div>
                            <RichTextContent
                                document={experience.body_document}
                                text={experience.body}
                            />
                            {experience.evidence_image && (
                                <a
                                    href={experience.evidence_image.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="focus-visible:ring-ring mt-5 block w-fit max-w-full overflow-hidden rounded-lg border focus-visible:ring-2"
                                >
                                    <img
                                        src={experience.evidence_image.url}
                                        alt={`Evidence shared by ${experience.user.name}`}
                                        width={experience.evidence_image.width}
                                        height={
                                            experience.evidence_image.height
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
                                    <time dateTime={experience.tried_on}>
                                        {formatDate(experience.tried_on)}
                                    </time>
                                </p>
                            )}
                            {experience.evidence_url && (
                                <a
                                    href={experience.evidence_url}
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
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <MemberMessageLink
                                    memberId={experience.user.id}
                                    username={experience.user.username}
                                    context={{
                                        type: 'experience',
                                        id: experience.id,
                                    }}
                                    label="Message member"
                                    compact
                                />
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
                        asChild={Boolean(experiences.prev_page_url)}
                        variant="outline"
                        disabled={!experiences.prev_page_url}
                    >
                        {experiences.prev_page_url ? (
                            <Link
                                href={`${experiences.prev_page_url}#experiences`}
                                preserveScroll
                                preserveState
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
                        asChild={Boolean(experiences.next_page_url)}
                        variant="outline"
                        disabled={!experiences.next_page_url}
                    >
                        {experiences.next_page_url ? (
                            <Link
                                href={`${experiences.next_page_url}#experiences`}
                                preserveScroll
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
            {total > 0 && (
                <p className="text-muted-foreground mt-4 text-xs leading-5">
                    Self-reported experiences. Results depend on context. One
                    experience per person.
                </p>
            )}
        </section>
    );
}
