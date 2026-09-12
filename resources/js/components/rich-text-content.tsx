import type { ReactNode } from 'react';

export type RichTextNode = {
    type: string;
    text?: string;
    attrs?: {
        href?: string;
        src?: string;
        imageId?: number;
        alt?: string;
        width?: number;
        height?: number;
        start?: number;
    };
    marks?: { type: string; attrs?: { href?: string } }[];
    content?: RichTextNode[];
};

export function plainDocument(text: string): RichTextNode {
    return {
        type: 'doc',
        content: text.split('\n').map((line) => ({
            type: 'paragraph',
            content: line ? [{ type: 'text', text: line }] : [],
        })),
    };
}

function safeUrl(value?: string) {
    return value && /^https?:\/\//i.test(value) ? value : undefined;
}

function renderNode(node: RichTextNode, key: number): ReactNode {
    const children = node.content?.map(renderNode);
    switch (node.type) {
        case 'text': {
            let text: ReactNode = node.text;
            for (const mark of node.marks ?? []) {
                if (mark.type === 'bold') text = <strong>{text}</strong>;
                if (mark.type === 'italic') text = <em>{text}</em>;
                if (mark.type === 'link' && safeUrl(mark.attrs?.href))
                    text = (
                        <a
                            href={mark.attrs?.href}
                            target="_blank"
                            rel="nofollow ugc noopener noreferrer"
                        >
                            {text}
                        </a>
                    );
            }
            return <span key={key}>{text}</span>;
        }
        case 'paragraph':
            return <p key={key}>{children ?? <br />}</p>;
        case 'bulletList':
            return <ul key={key}>{children}</ul>;
        case 'orderedList':
            return (
                <ol key={key} start={node.attrs?.start}>
                    {children}
                </ol>
            );
        case 'listItem':
            return <li key={key}>{children}</li>;
        case 'hardBreak':
            return <br key={key} />;
        case 'image':
            return safeUrl(node.attrs?.src) ? (
                <a
                    key={key}
                    href={node.attrs?.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={node.attrs?.alt || 'Open photo at full size'}
                >
                    <img
                        src={node.attrs?.src}
                        alt={node.attrs?.alt ?? ''}
                        width={node.attrs?.width}
                        height={node.attrs?.height}
                        loading="lazy"
                    />
                </a>
            ) : null;
        default:
            return null;
    }
}

export function RichTextContent({
    document,
    text,
}: {
    document?: RichTextNode | null;
    text: string;
}) {
    return document ? (
        <div className="wb-rich-text">{document.content?.map(renderNode)}</div>
    ) : (
        <p className="wb-detail-body">{text}</p>
    );
}
