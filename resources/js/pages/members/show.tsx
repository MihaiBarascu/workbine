import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    CalendarDays,
    MapPin,
    Pencil,
} from 'lucide-react';
import { MemberAvatar } from '@/components/community';
import { CopyLinkButton } from '@/components/copy-link-button';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';

type View = 'methods' | 'topics' | 'experiences';
type Contribution = {
    id: number;
    title: string;
    excerpt: string;
    href: string;
    created_at: string | null;
    saves_count: number | null;
    feedback: {
        total: number;
        worked: number;
        partly: number;
        did_not_work: number;
        url: string;
    } | null;
    outcome: 'worked' | 'partly' | 'did_not_work' | null;
};
type Props = {
    member: {
        id: number;
        name: string;
        username: string;
        avatar_url: string | null;
        bio: string | null;
        location: string | null;
        website: string | null;
        joined: string | null;
        counts: Record<View | 'topic_saves', number>;
        impact: {
            methods_tried: number;
            worked: number;
            partly: number;
            topic_saves: number;
        };
        reputation: {
            score: number;
            saves: number;
            worked: number;
            partly: number;
            supporters: number;
            limited_points: number;
        };
    };
    view: View;
    impact: string;
    contributions: {
        data: Contribution[];
        total: number;
        current_page: number;
        last_page: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
};
const tabs: { value: View; label: string }[] = [
    { value: 'methods', label: 'Methods' },
    { value: 'topics', label: 'Topics' },
    { value: 'experiences', label: 'Experiences' },
];
const outcomes = {
    worked: 'Worked for me',
    partly: 'Partly worked',
    did_not_work: 'Did not work for me',
};

export default function MemberProfile({
    member,
    view,
    impact,
    contributions,
}: Props) {
    const { auth, emailVerificationAvailable } = usePage<{
        auth: { user: User | null };
        emailVerificationAvailable: boolean;
    }>().props;
    const own = auth.user?.id === member.id;
    const impactCards = [
        {
            key: 'tried',
            value: member.impact.methods_tried,
            label: 'Methods tried',
            detail: 'Put into practice by other members',
            view: 'methods',
        },
        {
            key: 'worked',
            value: member.impact.worked,
            label: 'Worked for others',
            detail: 'Experiences reporting a positive result',
            view: 'methods',
        },
        {
            key: 'partly',
            value: member.impact.partly,
            label: 'Partly worked',
            detail: 'Useful results with limitations',
            view: 'methods',
        },
        {
            key: 'saved',
            value: member.impact.topic_saves,
            label: 'Topic saves',
            detail: 'Bookmarks by other members',
            view: 'topics',
        },
    ];
    const activeImpact = impactCards.find((card) => card.key === impact);
    return (
        <PublicShell>
            <Head title={`${member.name} — Community profile`} />
            <main className="wb-page wb-member-page">
                <Link href="/topics" className="wb-back-link">
                    ← Back to the community
                </Link>
                <section
                    className="wb-profile-header"
                    aria-labelledby="member-name"
                >
                    <div className="wb-profile-cover" aria-hidden="true">
                        <span>Ideas are better with experience.</span>
                    </div>
                    <div className="wb-profile-intro">
                        <MemberAvatar
                            name={member.name}
                            src={member.avatar_url}
                            large
                        />
                        <div className="wb-profile-actions">
                            {own && (
                                <Button asChild variant="outline">
                                    <Link href="/settings/profile">
                                        <Pencil aria-hidden="true" />
                                        Edit profile
                                    </Link>
                                </Button>
                            )}
                            <CopyLinkButton
                                path={`/members/${member.username}`}
                            />
                        </div>
                        <div className="wb-profile-name">
                            <p className="wb-kicker">Community member</p>
                            <h1 id="member-name">{member.name}</h1>
                            <p className="text-muted-foreground mt-1 text-sm [overflow-wrap:anywhere]">
                                @{member.username}
                            </p>
                            <p className="wb-profile-bio">
                                {member.bio ||
                                    (own
                                        ? 'Your experience belongs here. Add an introduction to help people get to know you.'
                                        : 'This member has not added an introduction yet.')}
                            </p>
                        </div>
                        <div className="wb-profile-meta">
                            {member.location && (
                                <span>
                                    <MapPin aria-hidden="true" />
                                    {member.location}
                                </span>
                            )}
                            {member.joined && (
                                <span>
                                    <CalendarDays aria-hidden="true" />
                                    Joined {member.joined}
                                </span>
                            )}
                            {member.website && (
                                <a
                                    href={member.website}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow ugc"
                                >
                                    Personal website
                                    <ArrowUpRight aria-hidden="true" />
                                    <span className="sr-only">
                                        (opens in a new tab)
                                    </span>
                                </a>
                            )}
                        </div>
                    </div>
                </section>
                <section aria-labelledby="impact-heading" className="my-7">
                    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                        <h2
                            id="impact-heading"
                            className="text-xl font-semibold"
                        >
                            Useful in practice
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            Open a number to explore the contributions behind
                            it.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {impactCards.map((card) => (
                            <Link
                                key={card.key}
                                href={`/members/${member.username}?view=${card.view}&impact=${card.key}#contributions`}
                                aria-label={`${card.label}: ${card.value}`}
                                aria-current={
                                    impact === card.key ? 'page' : undefined
                                }
                                className={`bg-card focus-visible:ring-ring hover:border-primary flex min-w-0 flex-col rounded-xl border p-5 transition-colors focus-visible:ring-2 ${impact === card.key ? 'border-primary' : ''}`}
                            >
                                <span className="text-primary text-3xl font-semibold tabular-nums">
                                    {card.value}
                                </span>
                                <span className="mt-2 flex items-center justify-between gap-2 font-semibold">
                                    {card.label}
                                    <ArrowRight
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                </span>
                                <span className="text-muted-foreground mt-1 text-xs leading-5">
                                    {card.detail}
                                </span>
                            </Link>
                        ))}
                    </div>
                    <p className="text-muted-foreground mt-3 text-xs leading-5">
                        Outcomes are self-reported experiences. One person can
                        report results on several methods or save several
                        topics; these are not unique people counts.
                    </p>
                </section>
                <div className="wb-member-grid">
                    <section
                        id="contributions"
                        className="wb-panel wb-contributions scroll-mt-6"
                        aria-label="Member contributions"
                    >
                        <nav
                            className="wb-profile-tabs"
                            aria-label="Profile contributions"
                        >
                            {tabs.map((tab) => (
                                <Link
                                    key={tab.value}
                                    href={`/members/${member.username}?view=${tab.value}`}
                                    aria-current={
                                        view === tab.value ? 'page' : undefined
                                    }
                                >
                                    {tab.label}
                                    <span>{member.counts[tab.value]}</span>
                                </Link>
                            ))}
                        </nav>
                        {activeImpact && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 text-sm">
                                <p>
                                    Showing:{' '}
                                    <strong>{activeImpact.label}</strong>
                                </p>
                                <Link
                                    href={`/members/${member.username}?view=${view}#contributions`}
                                    className="text-primary inline-flex min-h-10 items-center font-medium"
                                >
                                    Clear impact filter
                                </Link>
                            </div>
                        )}
                        {contributions.data.length ? (
                            contributions.data.map((entry) => (
                                <article
                                    key={entry.id}
                                    className="wb-contribution"
                                >
                                    <p className="wb-kicker">
                                        {entry.outcome
                                            ? outcomes[entry.outcome]
                                            : view === 'topics'
                                              ? 'A topic to explore'
                                              : 'A practical approach'}
                                    </p>
                                    <h2>
                                        <Link href={entry.href}>
                                            {entry.title}
                                        </Link>
                                    </h2>
                                    {entry.excerpt && <p>{entry.excerpt}</p>}
                                    {entry.feedback && (
                                        <div className="my-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                                            <Link
                                                href={entry.feedback.url}
                                                className="text-primary inline-flex min-h-10 items-center"
                                            >
                                                {entry.feedback.total}{' '}
                                                {entry.feedback.total === 1
                                                    ? 'experience'
                                                    : 'experiences'}
                                            </Link>
                                            {entry.feedback.worked > 0 && (
                                                <Link
                                                    href={`${entry.feedback.url}?outcome=worked`}
                                                    className="text-primary inline-flex min-h-10 items-center font-medium"
                                                >
                                                    {entry.feedback.worked}{' '}
                                                    worked
                                                </Link>
                                            )}
                                            {entry.feedback.partly > 0 && (
                                                <Link
                                                    href={`${entry.feedback.url}?outcome=partly`}
                                                    className="text-primary inline-flex min-h-10 items-center"
                                                >
                                                    {entry.feedback.partly}{' '}
                                                    partly worked
                                                </Link>
                                            )}
                                            {entry.feedback.did_not_work >
                                                0 && (
                                                <Link
                                                    href={`${entry.feedback.url}?outcome=did_not_work`}
                                                    className="text-muted-foreground inline-flex min-h-10 items-center"
                                                >
                                                    {
                                                        entry.feedback
                                                            .did_not_work
                                                    }{' '}
                                                    did not work
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                    {entry.saves_count !== null &&
                                        entry.saves_count > 0 && (
                                            <p className="text-muted-foreground text-sm">
                                                {entry.saves_count} saves from
                                                other members
                                            </p>
                                        )}
                                    <Link
                                        href={entry.href}
                                        className="wb-inline-link"
                                    >
                                        {view === 'experiences'
                                            ? 'Read experiences'
                                            : 'Read contribution'}
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                </article>
                            ))
                        ) : (
                            <div className="wb-profile-empty">
                                <BookOpen aria-hidden="true" />
                                <h2>
                                    {activeImpact
                                        ? 'No matching contributions yet'
                                        : own
                                          ? 'Your next contribution starts here'
                                          : `No ${view} shared yet`}
                                </h2>
                                <p>
                                    {activeImpact
                                        ? 'This view will show contributions when members try the methods or save the topics. You can clear the filter to see everything shared.'
                                        : own
                                          ? 'Start a topic with your method, open a subject to explore, or add your experience to an existing discussion.'
                                          : 'When this member shares something, it will appear in this space.'}
                                </p>
                                <Button asChild variant="outline">
                                    <Link href="/topics">
                                        Explore the community
                                    </Link>
                                </Button>
                            </div>
                        )}
                        {contributions.last_page > 1 && (
                            <nav
                                aria-label="Contribution pagination"
                                className="wb-pagination"
                            >
                                <Button
                                    asChild={Boolean(
                                        contributions.prev_page_url,
                                    )}
                                    variant="outline"
                                    disabled={!contributions.prev_page_url}
                                >
                                    {contributions.prev_page_url ? (
                                        <Link
                                            href={contributions.prev_page_url}
                                        >
                                            Previous
                                        </Link>
                                    ) : (
                                        <span>Previous</span>
                                    )}
                                </Button>
                                <span>
                                    Page {contributions.current_page} of{' '}
                                    {contributions.last_page}
                                </span>
                                <Button
                                    asChild={Boolean(
                                        contributions.next_page_url,
                                    )}
                                    variant="outline"
                                    disabled={!contributions.next_page_url}
                                >
                                    {contributions.next_page_url ? (
                                        <Link
                                            href={contributions.next_page_url}
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
                    <aside className="wb-profile-aside">
                        <details className="mb-6 border-b pb-5">
                            <summary className="cursor-pointer text-sm font-semibold">
                                Reputation details
                            </summary>
                            <p className="mt-3">
                                {member.reputation.score} points from{' '}
                                {member.reputation.supporters}{' '}
                                {member.reputation.supporters === 1
                                    ? 'member with a verified email'
                                    : 'members with verified emails'}
                                .
                            </p>
                            <dl>
                                <div>
                                    <dt>Counted saves</dt>
                                    <dd>+{member.reputation.saves}</dd>
                                </div>
                                <div>
                                    <dt>Worked ({member.reputation.worked})</dt>
                                    <dd>+{member.reputation.worked * 5}</dd>
                                </div>
                                <div>
                                    <dt>
                                        Partly worked (
                                        {member.reputation.partly})
                                    </dt>
                                    <dd>+{member.reputation.partly * 2}</dd>
                                </div>
                                {member.reputation.limited_points > 0 && (
                                    <div>
                                        <dt>Supporter limit adjustment</dt>
                                        <dd>
                                            −{member.reputation.limited_points}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                            <p>
                                One member contributes at most 25 points. Their
                                strongest outcome per author and topic counts.
                            </p>
                            <Link
                                href="/community/reputation"
                                className="text-primary inline-flex min-h-10 items-center text-sm font-medium"
                            >
                                How reputation works →
                            </Link>
                            {own &&
                                !auth.user?.email_verified_at &&
                                emailVerificationAvailable && (
                                    <p>
                                        Your feedback contributes to others’
                                        points after you confirm your email in{' '}
                                        <Link
                                            href="/settings/profile"
                                            className="text-primary underline"
                                        >
                                            account settings
                                        </Link>
                                        .
                                    </p>
                                )}
                        </details>
                        <h2>Shared with the community</h2>
                        <dl>
                            {tabs.map(({ value, label }) => (
                                <div key={value}>
                                    <dt>{label}</dt>
                                    <dd>{member.counts[value]}</dd>
                                </div>
                            ))}
                            <div>
                                <dt>Topic saves</dt>
                                <dd>{member.counts.topic_saves}</dd>
                            </div>
                        </dl>
                        <p>
                            Topic saves count bookmarks by other members across
                            these topics. Someone saving two topics counts
                            twice. Methods and outcomes are self-reported.
                        </p>
                    </aside>
                </div>
            </main>
        </PublicShell>
    );
}
