import { Form, usePage } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function DeleteUser() {
    const { auth } = usePage().props;
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-5">
            <Heading
                variant="small"
                title="Delete account"
                description="Permanently remove your account, your profile and everything you have shared. This cannot be undone."
            />
            <div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive dark:text-destructive-foreground"
                            data-test="delete-user-button"
                        >
                            <Trash2 aria-hidden="true" />
                            Delete account
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Delete your account?</DialogTitle>
                        <DialogDescription>
                            Your profile, topics, methods, experiences and
                            photos will be permanently deleted. Enter your
                            password to confirm.
                        </DialogDescription>

                        <Form
                            {...ProfileController.destroy.form()}
                            options={{
                                preserveScroll: true,
                            }}
                            onError={() => passwordInput.current?.focus()}
                            resetOnSuccess
                            className="space-y-6"
                        >
                            {({ resetAndClearErrors, processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="password"
                                            className="sr-only"
                                        >
                                            Password
                                        </Label>

                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            ref={passwordInput}
                                            placeholder="Password"
                                            autoComplete="current-password"
                                        />

                                        <InputError message={errors.password} />
                                        {auth.user.google_id && (
                                            <p className="text-muted-foreground text-sm">
                                                Joined with Google and never set
                                                a password? Log out and choose
                                                “Forgot your password?” on the
                                                login page to create one first.
                                            </p>
                                        )}
                                    </div>

                                    <DialogFooter className="gap-2">
                                        <DialogClose asChild>
                                            <Button
                                                variant="secondary"
                                                onClick={() =>
                                                    resetAndClearErrors()
                                                }
                                            >
                                                Cancel
                                            </Button>
                                        </DialogClose>

                                        <Button
                                            variant="destructive"
                                            disabled={processing}
                                            asChild
                                        >
                                            <button
                                                type="submit"
                                                data-test="confirm-delete-user-button"
                                            >
                                                Delete account
                                            </button>
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
