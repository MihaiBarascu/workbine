import { Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = { path: string };

export function CopyLinkButton({ path }: Props) {
    const [message, setMessage] = useState('');
    const [fallbackUrl, setFallbackUrl] = useState('');

    async function copyLink() {
        const url = new URL(path, window.location.origin).href;

        try {
            await navigator.clipboard.writeText(url);
            setFallbackUrl('');
            setMessage('Link copied');
        } catch {
            setFallbackUrl(url);
            setMessage('Select and copy the link below.');
        }
    }

    return (
        <div className="max-w-full space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={copyLink}>
                    <Copy aria-hidden="true" />
                    Copy link
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
