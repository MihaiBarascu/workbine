import { Form, usePage } from '@inertiajs/react';
import { Camera } from 'lucide-react';
import { useState } from 'react';
import {
    ImageUploadField,
    UploadProgress,
} from '@/components/image-upload-field';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';

export function ProfilePhoto() {
    const { auth, media } = usePage().props;
    const [hasSelection, setHasSelection] = useState(false);
    const [fieldKey, setFieldKey] = useState(0);
    const [savedMessage, setSavedMessage] = useState('');

    if (!media?.enabled && !auth.user.avatar_url) return null;

    return (
        <section
            className="wb-panel mb-5"
            aria-labelledby="profile-photo-heading"
        >
            <div className="wb-panel-heading">
                <div>
                    <p className="wb-kicker">
                        <Camera aria-hidden="true" />
                        Your face in the community
                    </p>
                    <h2 id="profile-photo-heading">Profile photo</h2>
                    <p>
                        Shown beside your contributions and on your public
                        profile.
                    </p>
                </div>
            </div>
            {media?.enabled ? (
                <Form
                    action="/settings/profile/avatar"
                    method="post"
                    options={{ preserveScroll: true }}
                    disableWhileProcessing
                    resetOnSuccess
                    className="space-y-4"
                    onSuccess={() => {
                        setHasSelection(false);
                        setFieldKey((key) => key + 1);
                        setSavedMessage('Your profile photo has been saved.');
                    }}
                >
                    {({ errors, processing, progress }) => (
                        <>
                            <ImageUploadField
                                key={fieldKey}
                                name="avatar"
                                label={
                                    auth.user.avatar_url
                                        ? 'Choose a new photo'
                                        : 'Choose a profile photo'
                                }
                                currentImage={auth.user.avatar_url}
                                maxUploadMb={media.maxUploadMb}
                                error={errors.avatar}
                                round
                                onSelectionChange={(selected) => {
                                    setHasSelection(selected);
                                    setSavedMessage('');
                                }}
                            />
                            {processing && (
                                <UploadProgress
                                    percentage={progress?.percentage}
                                />
                            )}
                            <Button
                                type="submit"
                                disabled={processing || !hasSelection}
                            >
                                {processing ? 'Saving photo…' : 'Save photo'}
                            </Button>
                        </>
                    )}
                </Form>
            ) : (
                <img
                    src={auth.user.avatar_url ?? undefined}
                    alt="Current photo"
                    className="bg-muted size-20 rounded-full border object-cover"
                />
            )}
            {auth.user.avatar_url && (
                <Form
                    action="/settings/profile/avatar"
                    method="delete"
                    options={{ preserveScroll: true }}
                    disableWhileProcessing
                    className="mt-3"
                    onSuccess={() =>
                        setSavedMessage('Your profile photo has been removed.')
                    }
                >
                    {({ processing, errors }) => (
                        <>
                            <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                disabled={
                                    processing ||
                                    (media?.enabled && hasSelection)
                                }
                            >
                                {processing
                                    ? 'Removing…'
                                    : 'Remove profile photo'}
                            </Button>
                            <InputError message={errors.avatar} />
                        </>
                    )}
                </Form>
            )}
            <p role="status" className="text-muted-foreground mt-3 text-sm">
                {savedMessage}
            </p>
        </section>
    );
}
