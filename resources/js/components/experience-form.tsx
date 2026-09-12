import { RichTextEditor } from '@/components/rich-text-editor';
import { Form, usePage } from '@inertiajs/react';
import {
    ImageUploadField,
    UploadProgress,
} from '@/components/image-upload-field';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ExperienceSummary } from '@/types';

type Props = {
    action: string;
    experience: ExperienceSummary | null;
};

export function ExperienceForm({ action, experience }: Props) {
    const { media } = usePage().props;
    return (
        <div className="space-y-5">
            <Form
                key={`${experience?.updated_at ?? 'new'}:${experience?.evidence_image?.url ?? 'no-image'}`}
                action={action}
                method="post"
                disableWhileProcessing
                className="space-y-5"
            >
                {({ errors, processing, progress }) => (
                    <>
                        <input type="hidden" name="_method" value="put" />
                        <div className="grid gap-2">
                            <Label htmlFor="outcome">
                                What was your result?
                            </Label>
                            <select
                                id="outcome"
                                name="outcome"
                                required
                                defaultValue={experience?.outcome ?? ''}
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
                                initialText={experience?.body}
                                initialDocument={experience?.body_document}
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
                                            experience?.tried_on ?? ''
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
                                            experience?.evidence_url ?? ''
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
                                {experience?.evidence_image && (
                                    <ImageUploadField
                                        key={String(media?.enabled)}
                                        name="evidence_image"
                                        label="Evidence photo (optional)"
                                        currentImage={
                                            experience?.evidence_image?.url
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
                                : experience
                                  ? 'Update my response'
                                  : 'Publish my response'}
                        </Button>
                    </>
                )}
            </Form>
            {experience && (
                <Form
                    action={action}
                    method="delete"
                    disableWhileProcessing
                    onBefore={() =>
                        window.confirm(
                            'Remove your public response? This cannot be undone.',
                        )
                    }
                >
                    {({ processing }) => (
                        <Button
                            type="submit"
                            variant="outline"
                            className="w-full"
                            disabled={processing}
                        >
                            Remove my response
                        </Button>
                    )}
                </Form>
            )}
        </div>
    );
}
