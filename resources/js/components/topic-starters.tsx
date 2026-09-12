import { ArrowRight } from 'lucide-react';

const starters = [
    {
        category: 'AI in Practice',
        title: 'Finding the first client for an AI service',
    },
    {
        category: 'Automation & Agents',
        title: 'Automating weekly reports for a client',
    },
    {
        category: 'Freelancing & Services',
        title: 'Pricing my first freelance project',
    },
];

type Props = {
    onChoose: (title: string) => void;
};

export function TopicStarters({ onChoose }: Props) {
    return (
        <div className="wb-topic-starters">
            <p className="wb-starter-hint">
                Ideas to make your own, not published topics.
            </p>
            <div className="wb-starter-options">
                {starters.map(({ category, title }) => (
                    <button
                        key={title}
                        type="button"
                        onClick={() => onChoose(title)}
                        aria-label={`Use idea: ${title}`}
                    >
                        <span>
                            <span className="wb-starter-category">
                                {category}
                            </span>
                            <span className="wb-starter-title">{title}</span>
                        </span>
                        <ArrowRight aria-hidden="true" />
                    </button>
                ))}
            </div>
        </div>
    );
}
