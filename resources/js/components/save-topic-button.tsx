import { Link, useForm } from '@inertiajs/react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
    topicSlug: string;
    saved: boolean;
    authenticated: boolean;
    className?: string;
};

export function SaveTopicButton({
    topicSlug,
    saved,
    authenticated,
    className,
}: Props) {
    const form = useForm({});
    const action = `/topics/${topicSlug}/saved`;

    if (!authenticated) {
        return (
            <Button asChild variant="outline" className={className}>
                <Link href={`/topics/${topicSlug}/save`}>
                    <Bookmark aria-hidden="true" />
                    Log in to save
                </Link>
            </Button>
        );
    }

    return (
        <Button
            type="button"
            variant="outline"
            className={className}
            aria-pressed={saved}
            aria-label={saved ? 'Remove saved topic' : 'Save topic'}
            disabled={form.processing}
            onClick={() => {
                if (saved) {
                    form.delete(action, { preserveScroll: true });
                } else {
                    form.put(action, { preserveScroll: true });
                }
            }}
        >
            {saved ? (
                <BookmarkCheck aria-hidden="true" />
            ) : (
                <Bookmark aria-hidden="true" />
            )}
            {form.processing
                ? saved
                    ? 'Removing…'
                    : 'Saving…'
                : saved
                  ? 'Saved'
                  : 'Save topic'}
        </Button>
    );
}
