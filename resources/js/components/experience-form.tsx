import { RichTextEditor } from '@/components/rich-text-editor';
import { Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Form } from '@inertiajs/react';
import { ConfirmSubmit } from '@/components/confirm-submit';
import InputError from '@/components/input-error';
import { OutcomeChoice } from '@/components/outcome';
import { PhotoGalleryField } from '@/components/photo-gallery-field';
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
    const [initialMethodRevision] = useState(methodRevision);
    const [draftExperience, setDraftExperience] = useState(experience);
    const [experienceRevision, setExperienceRevision] = useState(
        experience?.revision ?? 'new',
    );
    const [submission, setSubmission] = useState<'save' | 'delete' | null>(
        null,
    );
    const removeForm = useId();
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
                {({ errors, processing }) => (
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
                        <OutcomeChoice
                            defaultValue={draftExperience?.outcome}
                            error={errors.outcome}
                        />
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
                        <PhotoGalleryField
                            name="photos"
                            initialPhotos={draftExperience?.photos}
                            errors={errors}
                        />
                        <details
                            className="wb-writing-help"
                            open={
                                errors.tried_on || errors.evidence_url
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
                            </div>
                        </details>
                        <p className="text-muted-foreground text-xs leading-5">
                            This is public. Do not include passwords, customer
                            data or private documents. Only share evidence you
                            have permission to publish.
                        </p>
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
                    id={removeForm}
                    action={action}
                    method="delete"
                    disableWhileProcessing
                    onStart={() => setSubmission('delete')}
                    onSuccess={(page) =>
                        acceptCurrentExperience(
                            page.props.ownExperience as OwnExperience | null,
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
                            <ConfirmSubmit
                                form={removeForm}
                                title="Remove your response?"
                                description="Your response and its photos will be removed from this method. This cannot be undone."
                                confirmLabel="Remove response"
                                variant="ghost"
                                className="text-destructive hover:text-destructive dark:text-destructive-foreground w-fit"
                                disabled={processing}
                            >
                                <Trash2 aria-hidden="true" />
                                Remove my response
                            </ConfirmSubmit>
                        </div>
                    )}
                </Form>
            )}
        </div>
    );
}
