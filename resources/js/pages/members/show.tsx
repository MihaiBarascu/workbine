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
        counts: Record<View, number>;
    };
    view: View;
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

export default function MemberProfile({ member, view, contributions }: Props) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    const own = auth.user?.id === member.id;
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
                <div className="wb-member-grid">
                    <section
                        className="wb-panel wb-contributions"
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
                                    {own
                                        ? 'Your next contribution starts here'
                                        : `No ${view} shared yet`}
                                </h2>
                                <p>
                                    {own
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
                        <h2>Shared with the community</h2>
                        <dl>
                            {tabs.map(({ value, label }) => (
                                <div key={value}>
                                    <dt>{label}</dt>
                                    <dd>{member.counts[value]}</dd>
                                </div>
                            ))}
                        </dl>
                        <p>
                            These are real contributions, not a reputation
                            score. Methods and outcomes are self-reported.
                        </p>
                    </aside>
                </div>
            </main>
        </PublicShell>
    );
}
