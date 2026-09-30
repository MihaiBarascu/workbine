import { Link, useForm, usePage } from '@inertiajs/react';
import {
    Flag,
    Heart,
    MessageSquare,
    MoreHorizontal,
    Pencil,
    ArrowRight,
    Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { MemberLink } from '@/components/community';
import { SaveTopicButton } from '@/components/save-topic-button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { shareLink } from '@/lib/share-link';

import type { MethodSummary, TopicSummary, User } from '@/types';

function methodOutcomeSummary(method: MethodSummary): string {
    const worked = method.worked_count ?? 0;
    const partly = method.partly_count ?? 0;
    const didNotWork = Math.max(0, method.experiences_count - worked - partly);
    const outcomes = [
        worked > 0 ? `${worked} worked` : null,
        partly > 0 ? `${partly} partly` : null,
        didNotWork > 0 ? `${didNotWork} did not work` : null,
    ].filter(Boolean);

    return `${method.experiences_count} ${method.experiences_count === 1 ? 'experience' : 'experiences'}${outcomes.length ? ` · ${outcomes.join(' · ')}` : ''}`;
}

async function shareTopic(slug: string) {
    const path = `/topics/${slug}`;
    const outcome = await shareLink(path);
    if (outcome === 'copied') toast.success('Link copied');
    if (outcome === 'failed')
        toast('Copy this link', {
            description: new URL(path, window.location.origin).href,
        });
}

export function LikeTopicButton({ topic }: { topic: TopicSummary }) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    const form = useForm({});
    const count = topic.likes_count ?? 0;
    if (auth.user?.id === topic.user.id)
        return (
            <span
                className="wb-topic-appreciation"
                aria-label={`${count} appreciations`}
            >
                <Heart aria-hidden="true" />
                {count}
            </span>
        );
    if (!auth.user)
        return (
            <Link
                href={`/topics/${topic.slug}/like`}
                className="wb-topic-appreciation"
                aria-label="Log in to appreciate this topic"
            >
                <Heart aria-hidden="true" />
                {count}
            </Link>
        );
    return (
        <button
            type="button"
            className={`wb-topic-appreciation ${topic.liked ? 'is-liked' : ''}`}
            aria-label={
                topic.liked ? 'Remove appreciation' : 'Appreciate topic'
            }
            aria-pressed={topic.liked ?? false}
            disabled={form.processing}
            onClick={() => {
                if (topic.liked)
                    form.delete(`/topics/${topic.slug}/like`, {
                        preserveScroll: true,
                    });
                else
                    form.put(`/topics/${topic.slug}/like`, {
                        preserveScroll: true,
                    });
            }}
        >
            <Heart
                aria-hidden="true"
                fill={topic.liked ? 'currentColor' : 'none'}
            />
            {count}
        </button>
    );
}

export function TopicCard({
    topic,
    categories,
}: {
    topic: TopicSummary;
    categories: Record<string, string>;
}) {
    const { auth, reportsEnabled } = usePage<{
        auth: { user: User | null };
        reportsEnabled: boolean;
    }>().props;
    return (
        <article className="wb-entry wb-topic-card">
            <div className="wb-card-content">
                {topic.cover_image && (
                    <Link
                        href={`/topics/${topic.slug}`}
                        className="wb-entry-photo"
                        tabIndex={-1}
                        aria-hidden="true"
                    >
                        <img
                            src={topic.cover_image.url}
                            width={topic.cover_image.width}
                            height={topic.cover_image.height}
                            loading="lazy"
                            alt=""
                        />
                    </Link>
                )}
                <div className="wb-card-copy">
                    {topic.category && (
                        <Link
                            href={`/topics?category=${topic.category}#topics`}
                            className="wb-card-category"
                        >
                            {categories[topic.category]}
                        </Link>
                    )}
                    <h3>
                        <Link href={`/topics/${topic.slug}`}>
                            {topic.title}
                        </Link>
                    </h3>
                    <p className="wb-entry-description">
                        {topic.description ||
                            'Know a way to do this? Share what works for you.'}
                    </p>
                    {Boolean(topic.tags?.length) && (
                        <div className="wb-card-tags">
                            {topic.tags?.map((tag) => (
                                <Link
                                    key={tag}
                                    href={`/topics?tag=${encodeURIComponent(tag)}#topics`}
                                >
                                    #{tag}
                                </Link>
                            ))}
                        </div>
                    )}
                    {topic.method_preview && (
                        <div className="border-border/70 mt-4 border-l-2 pl-3">
                            <p className="text-muted-foreground text-xs font-medium">
                                A method with real experience
                            </p>
                            <Link
                                href={`/topics/${topic.slug}/methods/${topic.method_preview.id}`}
                                className="mt-1 inline-flex items-center gap-1 font-medium hover:underline"
                            >
                                {topic.method_preview.title}
                                <ArrowRight className="size-3.5" />
                            </Link>
                            <p className="text-muted-foreground mt-1 text-sm leading-6">
                                {topic.method_preview.body}
                            </p>
                            <p className="text-muted-foreground mt-2 text-xs">
                                {methodOutcomeSummary(topic.method_preview)}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <div className="wb-card-author">
                <MemberLink user={topic.user} avatar />
                {topic.created_at && (
                    <time dateTime={topic.created_at}>
                        {new Intl.DateTimeFormat('en', {
                            month: 'short',
                            day: 'numeric',
                            timeZone: 'UTC',
                        }).format(new Date(topic.created_at))}
                    </time>
                )}
            </div>
            <footer className="wb-card-actions">
                <LikeTopicButton topic={topic} />
                {topic.methods_count === 0 ? (
                    <Link
                        href={`/topics/${topic.slug}/methods/create`}
                        className="wb-card-first-method"
                    >
                        <span className="wb-card-first-long">
                            Create the first method
                        </span>
                        <span className="wb-card-first-short">
                            Add a method
                        </span>
                        <ArrowRight aria-hidden="true" />
                    </Link>
                ) : (
                    <Link
                        href={`/topics/${topic.slug}#methods-heading`}
                        className="wb-card-methods"
                    >
                        <MessageSquare aria-hidden="true" />
                        {topic.methods_count}{' '}
                        {topic.methods_count === 1 ? 'method' : 'methods'}
                    </Link>
                )}
                <SaveTopicButton
                    topicSlug={topic.slug}
                    saved={topic.saved ?? false}
                    authenticated={Boolean(auth.user)}
                    compact
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="wb-card-more"
                            aria-label={`More options for ${topic.title}`}
                            title="More options"
                        >
                            <MoreHorizontal aria-hidden="true" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                            onSelect={() => void shareTopic(topic.slug)}
                        >
                            <Share2 aria-hidden="true" />
                            Share link
                        </DropdownMenuItem>
                        {reportsEnabled && auth.user?.id !== topic.user.id && (
                            <DropdownMenuItem asChild>
                                <Link
                                    href={`/reports/topic/${topic.id}/create`}
                                >
                                    <Flag aria-hidden="true" />
                                    Report topic
                                </Link>
                            </DropdownMenuItem>
                        )}
                        {auth.user?.id === topic.user.id && (
                            <DropdownMenuItem asChild>
                                <Link href={`/topics/${topic.slug}/edit`}>
                                    <Pencil aria-hidden="true" />
                                    Edit topic
                                </Link>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </footer>
        </article>
    );
}
