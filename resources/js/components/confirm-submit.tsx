import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

type Props = {
    /** The id of the form this confirmation submits. */
    form: string;
    title: string;
    description: string;
    confirmLabel: string;
    disabled?: boolean;
    variant?: 'outline' | 'destructive' | 'ghost';
    className?: string;
    children: ReactNode;
};

/**
 * Asks in an in-app dialog before submitting a destructive form, instead of
 * the browser's own confirm box. Cancelling leaves the page untouched.
 */
export function ConfirmSubmit({
    form,
    title,
    description,
    confirmLabel,
    disabled,
    variant = 'outline',
    className,
    children,
}: Props) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant={variant}
                    className={className}
                    disabled={disabled}
                >
                    {children}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Cancel
                        </Button>
                    </DialogClose>
                    {/* Submits the form by id; the dialog renders outside it. */}
                    <Button
                        type="submit"
                        form={form}
                        variant="destructive"
                        onClick={() => setOpen(false)}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
