import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

type TurnstileApi = {
    render: (
        container: HTMLElement,
        options: {
            sitekey: string;
            action: string;
            theme: 'light' | 'dark';
            size: 'flexible' | 'compact';
            'response-field': false;
            callback: (token: string) => void;
            'expired-callback': () => void;
            'error-callback': () => boolean;
            'timeout-callback': () => void;
        },
    ) => string;
    remove: (id: string) => void;
};

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

let scriptPromise: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const fail = () => {
            window.clearTimeout(timeout);
            script.remove();
            scriptPromise = undefined;
            reject(new Error('Verification could not load.'));
        };
        const timeout = window.setTimeout(fail, 15000);

        script.src =
            'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.onload = () => {
            window.clearTimeout(timeout);
            if (window.turnstile) resolve(window.turnstile);
            else fail();
        };
        script.onerror = fail;
        document.head.appendChild(script);
    });

    return scriptPromise;
}

type Props = {
    siteKey: string;
    resetKey: number;
    onToken: (token: string) => void;
};

export default function Turnstile({ siteKey, resetKey, onToken }: Props) {
    const container = useRef<HTMLDivElement>(null);
    const [retry, setRetry] = useState(0);
    const [status, setStatus] = useState('Loading verification…');
    const [failed, setFailed] = useState(false);
    const [compact, setCompact] = useState(false);

    useEffect(() => {
        const observer = new ResizeObserver(([entry]) => {
            setCompact(entry.contentRect.width < 300);
        });
        if (container.current) observer.observe(container.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        let active = true;
        let widget: string | undefined;
        let api: TurnstileApi | undefined;
        onToken('');
        setFailed(false);
        setStatus('Loading verification…');

        const fail = () => {
            if (!active) return true;
            onToken('');
            setFailed(true);
            setStatus('Verification could not finish. Please try again.');
            return true;
        };

        void loadTurnstile()
            .then((loaded) => {
                if (!active || !container.current) return;
                api = loaded;
                setStatus('Complete the verification below.');
                widget = api.render(container.current, {
                    sitekey: siteKey,
                    action: 'register',
                    theme: document.documentElement.classList.contains('dark')
                        ? 'dark'
                        : 'light',
                    size: compact ? 'compact' : 'flexible',
                    'response-field': false,
                    callback: (token) => {
                        if (!active) return;
                        onToken(token);
                        setFailed(false);
                        setStatus('Verification complete.');
                    },
                    'expired-callback': () => {
                        if (!active) return;
                        onToken('');
                        setFailed(true);
                        setStatus('Verification expired. Please verify again.');
                    },
                    'error-callback': fail,
                    'timeout-callback': fail,
                });
            })
            .catch(fail);

        return () => {
            active = false;
            if (widget !== undefined) api?.remove(widget);
        };
    }, [siteKey, resetKey, retry, onToken, compact]);

    return (
        <div className="grid min-w-0 gap-2">
            <p role="status" className="text-muted-foreground text-sm">
                {status}
            </p>
            <div ref={container} className="min-w-0" />
            {failed && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRetry((value) => value + 1)}
                >
                    Retry verification
                </Button>
            )}
        </div>
    );
}
