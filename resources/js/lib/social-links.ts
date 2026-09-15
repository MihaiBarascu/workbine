import type { SocialPlatform } from '@/types/auth';

export const socialPlatforms: { value: SocialPlatform; label: string }[] = [
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'github', label: 'GitHub' },
    { value: 'x', label: 'X' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'bluesky', label: 'Bluesky' },
    { value: 'mastodon', label: 'Mastodon' },
];

export function socialLabel(platform: SocialPlatform): string {
    return (
        socialPlatforms.find((item) => item.value === platform)?.label ??
        platform
    );
}
