export type TopicSummary = {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    created_at: string | null;
    methods_count: number;
    user: {
        id: number;
        name: string;
        username: string;
    };
};

export type MethodSummary = {
    id: number;
    title: string;
    body: string;
    source_url: string | null;
    created_at: string | null;
    experiences_count: number;
    user: {
        id: number;
        name: string;
        username: string;
    };
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
    evidence_url: string | null;
    tried_on: string | null;
    created_at: string | null;
    updated_at: string | null;
    user: { id: number; name: string; username: string };
};

export type PaginatedExperiences = {
    data: ExperienceSummary[];
    total: number;
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};
