import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Link2, List, ListOrdered } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { plainDocument } from '@/components/rich-text-content';
import type { RichTextNode } from '@/components/rich-text-content';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { editorLinkHelp, validEditorLink } from '@/lib/editor-links';

const extensions = [
    StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: { openOnClick: false, isAllowedUri: validEditorLink },
    }),
];

const photosElsewhere = 'Photos go in the gallery below the text.';

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
    const [document, setDocument] = useState<RichTextNode>(
        () => initialDocument ?? plainDocument(initialText),
    );
    const [text, setText] = useState(initialText);
    const [error, setError] = useState('');
    const [pasteNotice, setPasteNotice] = useState('');
    const [linkOpen, setLinkOpen] = useState(false);
    const [href, setHref] = useState('');
    const wrapper = useRef<HTMLDivElement>(null);
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
            transformPastedHTML: (html) => {
                // Let Tiptap parse its supported formatting; adapt only lossy cases.
                const pasted = new DOMParser().parseFromString(
                    html,
                    'text/html',
                );
                const notices: string[] = [];
                if (
                    pasted.querySelector(
                        'h1,h2,h3,h4,h5,h6,pre,code,blockquote,table,hr,s,del,u',
                    )
                ) {
                    notices.push(
                        'Pasted formatting was simplified to match this editor. Review the text before publishing.',
                    );
                }
                for (const block of pasted.querySelectorAll('pre')) {
                    const lines = (block.textContent || '')
                        .split('\n')
                        .map((line) => {
                            const paragraph = pasted.createElement('p');
                            paragraph.textContent = line;
                            return paragraph;
                        });
                    block.replaceWith(...lines);
                }
                for (const row of pasted.querySelectorAll('tr')) {
                    const paragraph = pasted.createElement('p');
                    for (const [index, cell] of Array.from(
                        row.cells,
                    ).entries()) {
                        if (index) paragraph.append(' | ');
                        paragraph.append(...Array.from(cell.childNodes));
                    }
                    row.replaceWith(paragraph);
                }
                for (const image of pasted.querySelectorAll('img')) {
                    image.replaceWith(
                        pasted.createTextNode(image.getAttribute('alt') || ''),
                    );
                    notices.push(
                        `Copied images were not added. ${photosElsewhere}`,
                    );
                }
                for (const link of pasted.querySelectorAll('a')) {
                    if (!validEditorLink(link.getAttribute('href') || '')) {
                        notices.push(
                            `The link on “${(link.textContent || '').slice(0, 80)}” was removed; its text was kept. ${editorLinkHelp}`,
                        );
                        link.replaceWith(...Array.from(link.childNodes));
                    }
                }
                setPasteNotice([...new Set(notices)].join(' '));
                return pasted.body.innerHTML;
            },
            handlePaste: (_view, event) => {
                if (!event.clipboardData?.files.length) return false;
                event.preventDefault();
                setPasteNotice(photosElsewhere);
                return true;
            },
            handleDrop: (_view, event) => {
                if (!event.dataTransfer?.files.length) return false;
                event.preventDefault();
                setPasteNotice(photosElsewhere);
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
        const form = wrapper.current?.closest('form');
        const guard = (event: Event) => {
            if (wrapper.current?.closest('fieldset')?.disabled) return;
            if (
                !editor?.getText().trim() ||
                editor.getText().length > maxLength
            ) {
                event.preventDefault();
                event.stopImmediatePropagation();
                setError(
                    !editor?.getText().trim()
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
                <div className="wb-editor-sticky-tools">
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
                            disabled={!editor}
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
                            disabled={!editor}
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
                            disabled={!editor}
                            onClick={() =>
                                editor
                                    ?.chain()
                                    .focus()
                                    .toggleOrderedList()
                                    .run()
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
                            disabled={!editor}
                            onClick={() => {
                                setHref(
                                    String(
                                        editor?.getAttributes('link').href ??
                                            '',
                                    ),
                                );
                                setLinkOpen(!linkOpen);
                            }}
                        >
                            <Link2 />
                        </Button>
                    </div>
                    {linkOpen && (
                        <div className="wb-editor-options">
                            <Label htmlFor={`${id}-link`}>Link address</Label>
                            <Input
                                id={`${id}-link`}
                                type="text"
                                value={href}
                                placeholder="https://…"
                                onChange={(event) =>
                                    setHref(event.target.value)
                                }
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                        if (!validEditorLink(href)) {
                                            setError(editorLinkHelp);
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
                                        editor
                                            ?.chain()
                                            .focus()
                                            .unsetLink()
                                            .run();
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
                </div>
                <EditorContent editor={editor} />
            </div>
            {pasteNotice && (
                <p role="status" className="text-muted-foreground text-sm">
                    {pasteNotice}
                </p>
            )}
            <p
                id={`${id}-status`}
                role={error ? 'alert' : 'status'}
                className={
                    error
                        ? 'text-destructive text-sm'
                        : 'text-muted-foreground text-xs'
                }
            >
                {error}
            </p>
        </div>
    );
}
