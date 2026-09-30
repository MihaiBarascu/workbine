import { CircleCheck, CircleDashed, CircleX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import InputError from '@/components/input-error';
import type { ExperienceOutcome } from '@/types';

export const outcomeLabels: Record<ExperienceOutcome, string> = {
    worked: 'Worked for me',
    partly: 'Partly worked',
    did_not_work: 'Did not work for me',
};

export const outcomeIcons: Record<ExperienceOutcome, LucideIcon> = {
    worked: CircleCheck,
    partly: CircleDashed,
    did_not_work: CircleX,
};

/** The reported result as a labelled chip, with an icon besides colour. */
export function OutcomeBadge({ outcome }: { outcome: ExperienceOutcome }) {
    const Icon = outcomeIcons[outcome];
    return (
        <span className="wb-experience-outcome" data-outcome={outcome}>
            <Icon aria-hidden="true" />
            {outcomeLabels[outcome]}
        </span>
    );
}

/**
 * Three visible choices instead of a select: one tap on a phone, and each
 * result stays readable while writing the rest of the response.
 */
export function OutcomeChoice({
    defaultValue,
    error,
}: {
    defaultValue?: ExperienceOutcome;
    error?: string;
}) {
    return (
        <fieldset
            className="wb-outcome-choice"
            aria-invalid={Boolean(error)}
            aria-describedby="outcome-error"
        >
            <legend>What was your result?</legend>
            <div>
                {(Object.keys(outcomeLabels) as ExperienceOutcome[]).map(
                    (value) => {
                        const Icon = outcomeIcons[value];
                        return (
                            <label key={value} data-outcome={value}>
                                <input
                                    type="radio"
                                    name="outcome"
                                    value={value}
                                    required
                                    defaultChecked={defaultValue === value}
                                />
                                <Icon aria-hidden="true" />
                                <span>{outcomeLabels[value]}</span>
                            </label>
                        );
                    },
                )}
            </div>
            <InputError id="outcome-error" message={error} />
        </fieldset>
    );
}
