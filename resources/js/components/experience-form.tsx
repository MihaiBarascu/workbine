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
                            <Label htmlFor="experience-body">
                                Your context and experience
                            </Label>
                            <textarea
                                id="experience-body"
                                name="body"
                                required
                                minLength={20}
                                maxLength={5000}
                                rows={7}
                                defaultValue={experience?.body ?? ''}
                                aria-invalid={Boolean(errors.body)}
                                aria-describedby="experience-body-help experience-body-error"
                                placeholder="What did you try, in what situation, and what happened? What would you change?"
                                className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm leading-6 focus-visible:ring-2"
                            />
                            <p
                                id="experience-body-help"
                                className="text-muted-foreground text-xs leading-5"
                            >
                                Specific details help more than a vote. Include
                                limitations and things that did not work.
                            </p>
                            <InputError
                                id="experience-body-error"
                                message={errors.body}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="tried-on">
                                When did you try it? (optional)
                            </Label>
                            <Input
                                id="tried-on"
                                name="tried_on"
                                type="date"
                                max={new Date().toISOString().slice(0, 10)}
                                defaultValue={experience?.tried_on ?? ''}
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
                                defaultValue={experience?.evidence_url ?? ''}
                                placeholder="https://..."
                                aria-invalid={Boolean(errors.evidence_url)}
                                aria-describedby="evidence-url-error"
                            />
                            <InputError
                                id="evidence-url-error"
                                message={errors.evidence_url}
                            />
                        </div>
                        {(media?.enabled || experience?.evidence_image) && (
                            <ImageUploadField
                                key={String(media?.enabled)}
                                name="evidence_image"
                                label="Evidence photo (optional)"
                                currentImage={experience?.evidence_image?.url}
                                maxUploadMb={media.maxUploadMb}
                                error={
                                    errors.evidence_image ??
                                    errors.remove_evidence_image
                                }
                                allowRemove
                                uploadEnabled={Boolean(media?.enabled)}
                            />
                        )}
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
                                  ? 'Update my experience'
                                  : 'Publish my experience'}
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
                            'Remove your public experience? This cannot be undone.',
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
                            Remove my experience
                        </Button>
                    )}
                </Form>
            )}
        </div>
    );
}
