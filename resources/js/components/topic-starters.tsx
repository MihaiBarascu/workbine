import { ArrowRight } from 'lucide-react';

const starters = [
    { category: 'Learning', title: 'Making time to learn after work' },
    { category: 'Side projects', title: 'Keeping a small project moving' },
    { category: 'Everyday work', title: 'Making a weekly task take less time' },
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
