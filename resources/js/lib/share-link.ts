export type ShareOutcome = 'shared' | 'cancelled' | 'copied' | 'failed';

/**
 * Opens native sharing when available, otherwise copies the link. Cancelling
 * native sharing copies nothing; a refused clipboard reports `failed`.
 */
export async function shareLink(path: string): Promise<ShareOutcome> {
    const url = new URL(path, window.location.origin).href;
    if (navigator.share) {
        try {
            await navigator.share({ url });
            return 'shared';
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError')
                return 'cancelled';
        }
    }
    try {
        await navigator.clipboard.writeText(url);
        return 'copied';
    } catch {
        return 'failed';
    }
}
