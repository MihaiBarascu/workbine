import { RichTextEditor } from '@/components/rich-text-editor';
import { useState } from 'react';
import { Form, usePage } from '@inertiajs/react';
import {
    ImageUploadField,
    UploadProgress,
} from '@/components/image-upload-field';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OwnExperience } from '@/types';

type Props = {
    action: string;
    methodRevision: string;
    experience: OwnExperience | null;
};

export function ExperienceForm({ action, experience, methodRevision }: Props) {
    const { media } = usePage().props;
    const [initialMethodRevision] = useState(methodRevision);
    const [draftExperience, setDraftExperience] = useState(experience);
    const [experienceRevision, setExperienceRevision] = useState(
        experience?.revision ?? 'new',
    );
    const [submission, setSubmission] = useState<'save' | 'delete' | null>(
        null,
    );
    const acceptCurrentExperience = (current: OwnExperience | null) => {
        setDraftExperience(current);
        setExperienceRevision(current?.revision ?? 'new');
        setSubmission(null);
    };

    return (
        <div className="space-y-5">
            <Form
                key={experienceRevision}
                action={action}
                method="post"
                disableWhileProcessing
                className="space-y-5"
                onStart={() => setSubmission('save')}
                onSuccess={(page) =>
                    acceptCurrentExperience(
                        page.props.ownExperience as OwnExperience | null,
                    )
                }
            >
                {({ errors, processing, progress }) => (
                    <>
                        <input type="hidden" name="_method" value="put" />
                        <input
                            type="hidden"
                            name="method_revision"
                            value={initialMethodRevision}
                        />
                        <input
                            type="hidden"
                            name="experience_revision"
                            value={experienceRevision}
                        />
                        {submission === 'save' &&
                            (errors.method_revision ||
                                errors.experience_revision) && (
                                <div role="alert">
                                    <InputError
                                        message={
                                            errors.experience_revision ??
                                            errors.method_revision
                                        }
                                    />
                                    <a
                                        href={action.replace(
                                            /\/experience$/,
                                            '#share',
                                        )}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            window.location.reload();
                                        }}
                                        className="text-primary text-sm underline"
                                    >
                                        Copy your response and reload before
                                        trying again
                                    </a>
                                </div>
                            )}
                        <div className="grid gap-2">
                            <Label htmlFor="outcome">
                                What was your result?
                            </Label>
                            <select
                                id="outcome"
                                name="outcome"
                                required
                                defaultValue={draftExperience?.outcome ?? ''}
                                aria-invalid={Boolean(errors.outcome)}
                                aria-describedby="outcome-error"
                                className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2"
                            >
                                <option value="" disabled>
                                    Choose a result
                                </option>
                                <option value="worked">Worked for me</option>
                                <option value="partly">Partly worked</option>
                                <option value="did_not_work">
                                    Did not work for me
                                </option>
                            </select>
                            <InputError
                                id="outcome-error"
                                message={errors.outcome}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label
                                id="experience-body-label"
                                htmlFor="experience-body"
                            >
                                How did it go?
                            </Label>
                            <RichTextEditor
                                id="experience-body"
                                name="body"
                                initialText={draftExperience?.body}
                                initialDocument={draftExperience?.body_document}
                                invalid={Boolean(errors.body)}
                                describedBy="experience-body-error"
                                maxLength={5000}
                                placeholder="How did it go for you? Explain what worked or what you changed."
                            />
                            <InputError
                                id="experience-body-error"
                                message={errors.body}
                            />
                        </div>
                        <details
                            className="wb-writing-help"
                            open={
                                errors.tried_on ||
                                errors.evidence_url ||
                                errors.evidence_image
                                    ? true
                                    : undefined
                            }
                        >
                            <summary>Add a date or supporting link</summary>
                            <div className="mt-4 space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="tried-on">
                                        When did you try it? (optional)
                                    </Label>
                                    <Input
                                        id="tried-on"
                                        name="tried_on"
                                        type="date"
                                        max={new Date()
                                            .toISOString()
                                            .slice(0, 10)}
                                        defaultValue={
                                            draftExperience?.tried_on ?? ''
                                        }
                                        aria-invalid={Boolean(errors.tried_on)}
                                        aria-describedby="tried-on-error"
                                    />
                                    <InputError
                                        id="tried-on-error"
                                        message={errors.tried_on}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="evidence-url">
                                        Evidence link (optional)
                                    </Label>
                                    <Input
                                        id="evidence-url"
                                        name="evidence_url"
                                        type="url"
                                        maxLength={2048}
                                        defaultValue={
                                            draftExperience?.evidence_url ?? ''
                                        }
                                        placeholder="https://..."
                                        aria-invalid={Boolean(
                                            errors.evidence_url,
                                        )}
                                        aria-describedby="evidence-url-error"
                                    />
                                    <InputError
                                        id="evidence-url-error"
                                        message={errors.evidence_url}
                                    />
                                </div>
                                {draftExperience?.evidence_image && (
                                    <ImageUploadField
                                        key={String(media?.enabled)}
                                        name="evidence_image"
                                        label="Evidence photo (optional)"
                                        currentImage={
                                            draftExperience.evidence_image.url
                                        }
                                        maxUploadMb={media.maxUploadMb}
                                        error={
                                            errors.evidence_image ??
                                            errors.remove_evidence_image
                                        }
                                        allowRemove
                                        uploadEnabled={Boolean(media?.enabled)}
                                    />
                                )}
                            </div>
                        </details>
                        <p className="text-muted-foreground text-xs leading-5">
                            This is public. Do not include passwords, customer
                            data or private documents. Only share evidence you
                            have permission to publish.
                        </p>
                        {processing && (
                            <UploadProgress percentage={progress?.percentage} />
                        )}
                        <Button
                            type="submit"
                            disabled={processing}
                            className="w-full"
                        >
                            {processing
                                ? 'Saving...'
                                : draftExperience
                                  ? 'Update my response'
                                  : 'Publish my response'}
                        </Button>
                    </>
                )}
            </Form>
            {draftExperience && (
                <Form
                    action={action}
                    method="delete"
                    disableWhileProcessing
                    onStart={() => setSubmission('delete')}
                    onSuccess={(page) =>
                        acceptCurrentExperience(
                            page.props.ownExperience as OwnExperience | null,
                        )
                    }
                    onBefore={(visit) =>
                        visit.method !== 'delete' ||
                        window.confirm(
                            'Remove your public response? This cannot be undone.',
                        )
                    }
                >
                    {({ errors, processing }) => (
                        <div className="space-y-3">
                            <input
                                type="hidden"
                                name="experience_revision"
                                value={experienceRevision}
                            />
                            {submission === 'delete' &&
                                errors.experience_revision && (
                                    <div role="alert">
                                        <InputError
                                            message={errors.experience_revision}
                                        />
                                        <a
                                            href={action.replace(
                                                /\/experience$/,
                                                '#share',
                                            )}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                window.location.reload();
                                            }}
                                            className="text-primary text-sm underline"
                                        >
                                            Reload the latest response before
                                            trying again
                                        </a>
                                    </div>
                                )}
                            <Button
                                type="submit"
                                variant="outline"
                                className="w-full"
                                disabled={processing}
                            >
                                Remove my response
                            </Button>
                        </div>
                    )}
                </Form>
            )}
        </div>
    );
}
