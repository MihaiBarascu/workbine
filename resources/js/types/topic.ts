import type { RichTextNode } from '@/components/rich-text-content';

export type PublicMember = {
    id: number;
    name: string;
    username: string;
    avatar_url: string | null;
};

export type SharedImage = {
    url: string;
    width: number;
    height: number;
};

export type MediaSettings = {
    enabled: boolean;
    maxUploadMb: number;
};

export type TopicSummary = {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    created_at: string | null;
    updated_at: string | null;
    methods_count: number;
    saves_count: number;
    user: PublicMember;
};

export type MethodSummary = {
    id: number;
    title: string;
    body: string;
    body_document?: RichTextNode | null;
    source_url: string | null;
    created_at: string | null;
    updated_at: string | null;
    experiences_count: number;
    user: PublicMember;
};

export type PaginatedTopics = {
    data: TopicSummary[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

export type ExperienceOutcome = 'worked' | 'partly' | 'did_not_work';

export type ExperienceSummary = {
    id: number;
    outcome: ExperienceOutcome;
    body: string;
    body_document?: RichTextNode | null;
    evidence_url: string | null;
    evidence_image: SharedImage | null;
    tried_on: string | null;
    created_at: string | null;
    updated_at: string | null;
    user: PublicMember;
};

export type PaginatedExperiences = {
    data: ExperienceSummary[];
    total: number;
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};
