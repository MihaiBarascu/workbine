import { Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { shareLink } from '@/lib/share-link';

type Props = { path: string };

export function ShareLinkButton({ path }: Props) {
    const [message, setMessage] = useState('');
    const [fallbackUrl, setFallbackUrl] = useState('');
    const [sharing, setSharing] = useState(false);

    // The confirmation floats beside the button briefly instead of shifting it.
    useEffect(() => {
        if (message !== 'Link copied') return;
        const timer = window.setTimeout(() => setMessage(''), 2500);
        return () => window.clearTimeout(timer);
    }, [message]);

    async function share() {
        setSharing(true);
        setMessage('');
        setFallbackUrl('');
        try {
            const outcome = await shareLink(path);
            if (outcome === 'copied') setMessage('Link copied');
            if (outcome === 'failed') {
                setFallbackUrl(new URL(path, window.location.origin).href);
                setMessage('Select and copy the link below.');
            }
        } finally {
            setSharing(false);
        }
    }

    return (
        <div className="max-w-full space-y-2">
            <div className="wb-share-control">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Share link"
                    title="Share link"
                    disabled={sharing}
                    onClick={share}
                >
                    <Share2 aria-hidden="true" />
                </Button>
                <span
                    role="status"
                    className={
                        fallbackUrl ? 'wb-share-note' : 'wb-share-bubble'
                    }
                >
                    {message}
                </span>
            </div>
            {fallbackUrl && (
                <Input
                    aria-label="Link to copy"
                    value={fallbackUrl}
                    readOnly
                    autoFocus
                    onFocus={(event) => event.currentTarget.select()}
                    className="w-full"
                />
            )}
        </div>
    );
}
