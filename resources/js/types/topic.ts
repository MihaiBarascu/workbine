export type TopicSummary = {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    created_at: string | null;
    user: {
        id: number;
        name: string;
    };
};

export type PaginatedTopics = {
    data: TopicSummary[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};
