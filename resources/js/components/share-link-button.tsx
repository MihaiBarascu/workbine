import { Share2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = { path: string };

export function ShareLinkButton({ path }: Props) {
    const [message, setMessage] = useState('');
    const [fallbackUrl, setFallbackUrl] = useState('');
    const [sharing, setSharing] = useState(false);

    async function shareLink() {
        const url = new URL(path, window.location.origin).href;
        setSharing(true);
        setMessage('');
        setFallbackUrl('');
        try {
            if (navigator.share) {
                try {
                    await navigator.share({ url });
                    return;
                } catch (error) {
                    if (
                        error instanceof DOMException &&
                        error.name === 'AbortError'
                    )
                        return;
                }
            }
            try {
                await navigator.clipboard.writeText(url);
                setMessage('Link copied');
            } catch {
                setFallbackUrl(url);
                setMessage('Select and copy the link below.');
            }
        } finally {
            setSharing(false);
        }
    }

    return (
        <div className="max-w-full space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Share link"
                    title="Share link"
                    disabled={sharing}
                    onClick={shareLink}
                >
                    <Share2 aria-hidden="true" />
                </Button>
                <span role="status" className="text-muted-foreground text-xs">
                    {message}
                </span>
            </div>
            {fallbackUrl && (
                <Input
                    aria-label="Link to copy"
                    value={fallbackUrl}
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                    className="w-full"
                />
            )}
        </div>
    );
}
