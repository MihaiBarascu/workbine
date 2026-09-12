import { usePage } from '@inertiajs/react';
import Image from '@tiptap/extension-image';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, ImagePlus, Link2, List, ListOrdered } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { plainDocument } from '@/components/rich-text-content';
import type { RichTextNode } from '@/components/rich-text-content';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const UploadedImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            imageId: { default: null },
            width: { default: null },
            height: { default: null },
        };
    },
    // Images enter only through our upload action, never external pasted HTML.
    parseHTML() {
        return [];
    },
});

const extensions = [
    StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: { openOnClick: false, protocols: ['http', 'https'] },
    }),
    UploadedImage,
];

type Props = {
    id: string;
    name: string;
    initialText?: string;
    initialDocument?: RichTextNode | null;
    describedBy?: string;
    invalid?: boolean;
    placeholder: string;
    maxLength?: number;
};

export function RichTextEditor({
    id,
    name,
    initialText = '',
    initialDocument,
    describedBy,
    invalid,
    placeholder,
    maxLength = 10000,
}: Props) {
    const { media } = usePage().props;
    const [document, setDocument] = useState<RichTextNode>(
        () => initialDocument ?? plainDocument(initialText),
    );
    const [text, setText] = useState(initialText);
    const [uploading, setUploading] = useState(false);
    const busy = useRef(false);
    const [error, setError] = useState('');
    const [linkOpen, setLinkOpen] = useState(false);
    const [href, setHref] = useState('');
    const wrapper = useRef<HTMLDivElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const uploadHandler = useRef<(file: File) => void>(() => {});
    const editor = useEditor({
        extensions,
        content: document,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                id,
                role: 'textbox',
                'aria-labelledby': `${id}-label`,
                'aria-multiline': 'true',
                'aria-describedby': `${describedBy ?? ''} ${id}-status`,
                'aria-invalid': String(Boolean(invalid)),
                class: 'wb-rich-text wb-editor-content',
                'data-placeholder': placeholder,
            },
            handlePaste: (_view, event) => {
                const file = Array.from(event.clipboardData?.files ?? []).find(
                    (item) => item.type.startsWith('image/'),
                );
                if (!file) return false;
                event.preventDefault();
                uploadHandler.current(file);
                return true;
            },
            handleDrop: (_view, event) => {
                const file = event.dataTransfer?.files[0];
                if (!file) return false;
                event.preventDefault();
                uploadHandler.current(file);
                return true;
            },
        },
        onUpdate: ({ editor }) => {
            setDocument(editor.getJSON() as RichTextNode);
            setText(editor.getText());
        },
    });
    const selection = useEditorState({
        editor,
        selector: ({ editor }) => ({
            bold: editor?.isActive('bold') ?? false,
            bullet: editor?.isActive('bulletList') ?? false,
            ordered: editor?.isActive('orderedList') ?? false,
            image: editor?.isActive('image') ?? false,
            alt: String(editor?.getAttributes('image').alt ?? ''),
        }),
    });

    useEffect(() => {
        editor?.setOptions({
            editorProps: {
                ...editor.options.editorProps,
                attributes: {
                    ...(typeof editor.options.editorProps.attributes ===
                    'object'
                        ? editor.options.editorProps.attributes
                        : {}),
                    'aria-invalid': String(Boolean(invalid)),
                },
            },
        });
    }, [editor, invalid]);

    useEffect(() => {
        uploadHandler.current = async (file) => {
            if (!editor || busy.current) return;
            if (!media?.enabled) {
                setError(
                    'Photo uploads are currently unavailable. You can still publish your text.',
                );
                return;
            }
            let count = 0;
            editor.state.doc.descendants((node) => {
                if (node.type.name === 'image') count++;
            });
            if (count >= 10) {
                setError(
                    'You can add up to 10 photos. Remove one before adding another.',
                );
                return;
            }
            if (
                !['image/jpeg', 'image/png', 'image/webp'].includes(
                    file.type,
                ) ||
                file.size > media.maxUploadMb * 1024 * 1024
            ) {
                setError(
                    `Choose a JPEG, PNG or WebP photo up to ${media.maxUploadMb} MB.`,
                );
                return;
            }
            busy.current = true;
            setUploading(true);
            setError('');
            const insertionPoint = editor.state.selection.from;
            // Freeze the insertion point while the photo uploads.
            editor.setEditable(false);
            try {
                const data = new FormData();
                data.append('image', file);
                const token = documentCookie('XSRF-TOKEN');
                const response = await fetch('/editor/images', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': token,
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: data,
                });
                const result = await response.json();
                if (!response.ok)
                    throw new Error(
                        result.errors?.image?.[0] ??
                            (response.status === 429
                                ? 'Too many photo uploads. Please try again later.'
                                : 'The photo could not be uploaded. Please try again.'),
                    );
                if (!editor.isDestroyed)
                    editor
                        .chain()
                        .focus()
                        .insertContentAt(insertionPoint, [
                            {
                                type: 'image',
                                attrs: {
                                    imageId: result.id,
                                    src: result.url,
                                    width: result.width,
                                    height: result.height,
                                    alt: '',
                                },
                            },
                            { type: 'paragraph' },
                        ])
                        .run();
            } catch (exception) {
                setError(
                    exception instanceof Error
                        ? exception.message
                        : 'The photo could not be uploaded. Please try again.',
                );
            } finally {
                busy.current = false;
                setUploading(false);
                if (!editor.isDestroyed) editor.setEditable(true);
            }
        };
    }, [editor, media]);

    useEffect(() => {
        const form = wrapper.current?.closest('form');
        const guard = (event: Event) => {
            if (wrapper.current?.closest('fieldset')?.disabled) return;
            if (
                busy.current ||
                !editor?.getText().trim() ||
                editor.getText().length > maxLength
            ) {
                event.preventDefault();
                event.stopImmediatePropagation();
                setError(
                    busy.current
                        ? 'Wait for your photo to finish uploading.'
                        : !editor?.getText().trim()
                          ? 'Add a few words to explain what you did.'
                          : `Keep your explanation under ${maxLength.toLocaleString()} characters.`,
                );
                editor?.commands.focus();
            }
        };
        form?.addEventListener('submit', guard, true);
        return () => form?.removeEventListener('submit', guard, true);
    }, [editor, maxLength]);

    return (
        <div ref={wrapper} className="space-y-2">
            <input type="hidden" name={name} value={text} />
            <input
                type="hidden"
                name={`${name}_document`}
                value={JSON.stringify(document)}
            />
            <div
                className="wb-editor"
                data-empty={editor?.isEmpty ?? true}
                data-invalid={invalid || Boolean(error)}
            >
                <div
                    className="wb-editor-toolbar"
                    role="group"
                    aria-label="Text formatting"
                >
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Bold"
                        aria-pressed={selection?.bold}
                        disabled={!editor || uploading}
                        onClick={() =>
                            editor?.chain().focus().toggleBold().run()
                        }
                    >
                        <Bold />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Bulleted list"
                        aria-pressed={selection?.bullet}
                        disabled={!editor || uploading}
                        onClick={() =>
                            editor?.chain().focus().toggleBulletList().run()
                        }
                    >
                        <List />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Numbered steps"
                        aria-pressed={selection?.ordered}
                        disabled={!editor || uploading}
                        onClick={() =>
                            editor?.chain().focus().toggleOrderedList().run()
                        }
                    >
                        <ListOrdered />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Add link"
                        aria-expanded={linkOpen}
                        disabled={!editor || uploading}
                        onClick={() => {
                            setHref(
                                String(
                                    editor?.getAttributes('link').href ?? '',
                                ),
                            );
                            setLinkOpen(!linkOpen);
                        }}
                    >
                        <Link2 />
                    </Button>
                    {media?.enabled && (
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={!editor || uploading}
                            onClick={() => fileInput.current?.click()}
                        >
                            <ImagePlus />
                            {uploading ? 'Uploading…' : 'Photo'}
                        </Button>
                    )}
                    <input
                        ref={fileInput}
                        type="file"
                        className="sr-only"
                        tabIndex={-1}
                        aria-label="Upload photo"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploading || !media?.enabled}
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) uploadHandler.current(file);
                            event.target.value = '';
                        }}
                    />
                </div>
                {linkOpen && (
                    <div className="wb-editor-options">
                        <Label htmlFor={`${id}-link`}>Link address</Label>
                        <Input
                            id={`${id}-link`}
                            type="url"
                            value={href}
                            placeholder="https://…"
                            onChange={(event) => setHref(event.target.value)}
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                    if (
                                        !/^https?:\/\//i.test(href) ||
                                        !URL.canParse(href)
                                    ) {
                                        setError(
                                            'Use a complete link starting with https:// or http://.',
                                        );
                                        return;
                                    }
                                    if (
                                        editor?.state.selection.empty &&
                                        !editor.isActive('link')
                                    )
                                        editor
                                            .chain()
                                            .focus()
                                            .insertContent({
                                                type: 'text',
                                                text: href,
                                                marks: [
                                                    {
                                                        type: 'link',
                                                        attrs: { href },
                                                    },
                                                ],
                                            })
                                            .run();
                                    else
                                        editor
                                            ?.chain()
                                            .focus()
                                            .extendMarkRange('link')
                                            .setLink({ href })
                                            .run();
                                    setLinkOpen(false);
                                    setError('');
                                }}
                            >
                                Apply link
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    editor?.chain().focus().unsetLink().run();
                                    setLinkOpen(false);
                                }}
                            >
                                Remove link
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setLinkOpen(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
                <EditorContent editor={editor} />
                {selection?.image && (
                    <div className="wb-editor-options">
                        <Label htmlFor={`${id}-alt`}>
                            Describe this photo for people who cannot see it
                        </Label>
                        <Input
                            id={`${id}-alt`}
                            value={selection.alt}
                            maxLength={300}
                            onChange={(event) =>
                                editor?.commands.updateAttributes('image', {
                                    alt: event.target.value,
                                })
                            }
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                                editor?.chain().focus().deleteSelection().run()
                            }
                        >
                            Remove photo
                        </Button>
                    </div>
                )}
            </div>
            <p
                id={`${id}-status`}
                role={error ? 'alert' : 'status'}
                className={
                    error
                        ? 'text-destructive text-sm'
                        : 'text-muted-foreground text-xs'
                }
            >
                {error ||
                    (uploading
                        ? 'Uploading your photo… Your text stays here.'
                        : '')}
            </p>
        </div>
    );
}

function documentCookie(name: string) {
    const cookie = window.document.cookie
        .split('; ')
        .find((item) => item.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : '';
}
