import type { Auth } from '@/types/auth';
import type { MediaSettings } from '@/types/topic';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            media: MediaSettings;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
