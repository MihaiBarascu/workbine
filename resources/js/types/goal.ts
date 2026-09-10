export type GoalSummary = {
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

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export type PaginatedGoals = {
    data: GoalSummary[];
    links: PaginationLink[];
};
