import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle, FontSize, FontFamily } from '@tiptap/extension-text-style';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    List,
    ListOrdered,
    LinkIcon,
    Unlink,
    RemoveFormatting,
    Undo,
    Redo,
} from 'lucide-react';

const FONT_SIZES = [
    { label: 'Small', value: '12px' },
    { label: 'Normal', value: null },
    { label: 'Large', value: '18px' },
    { label: 'Huge', value: '24px' },
];

const FONT_FAMILIES = [
    { label: 'Default', value: null },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Courier New', value: '"Courier New", Courier, monospace' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
];

function ToolbarButton({ onClick, active, disabled, title, children }) {
    return (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                active ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
        >
            {children}
        </button>
    );
}

/**
 * Gmail-style rich text editor for composing/editing AI-generated email bodies.
 * Operates on HTML in/out via `value`/`onChange`.
 */
export default function RichTextEditor({
    value,
    onChange,
    placeholder = 'Write your email...',
    autoFocus = false,
    minHeightClass = 'min-h-[16rem]',
    className = '',
}) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: { rel: 'noopener noreferrer' },
            }),
            TextStyle,
            FontSize,
            FontFamily,
            Placeholder.configure({ placeholder }),
        ],
        content: value || '',
        autofocus: autoFocus,
        editorProps: {
            attributes: {
                class: `prose prose-sm max-w-none focus:outline-none px-4 py-3 ${minHeightClass}`,
            },
        },
        onUpdate: ({ editor: ed }) => {
            onChange?.(ed.getHTML());
        },
    });

    // Keep editor content in sync when `value` changes from outside (e.g. AI regenerate).
    useEffect(() => {
        if (!editor) return;
        const current = editor.getHTML();
        if (value !== current && (value || '') !== current) {
            editor.commands.setContent(value || '', { emitUpdate: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, editor]);

    if (!editor) return null;

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('Link URL', previousUrl || 'https://');
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const currentFontSize = editor.getAttributes('textStyle').fontSize || '';

    const setFontSize = (e) => {
        const fontSize = e.target.value;
        if (!fontSize) {
            editor.chain().focus().unsetFontSize().run();
        } else {
            editor.chain().focus().setFontSize(fontSize).run();
        }
    };

    const currentFontFamily = editor.getAttributes('textStyle').fontFamily || '';

    const setFontFamily = (e) => {
        const fontFamily = e.target.value;
        if (!fontFamily) {
            editor.chain().focus().unsetFontFamily().run();
        } else {
            editor.chain().focus().setFontFamily(fontFamily).run();
        }
    };

    return (
        <div className={`border-2 rounded-xl overflow-hidden bg-white ${className}`}>
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50">
                <select
                    value={currentFontFamily}
                    onChange={setFontFamily}
                    title="Font family"
                    className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md px-1.5 py-1 mr-1 focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-pointer"
                >
                    {FONT_FAMILIES.map((opt) => (
                        <option key={opt.label} value={opt.value || ''}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                <select
                    value={currentFontSize}
                    onChange={setFontSize}
                    title="Font size"
                    className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md px-1.5 py-1 mr-1 focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-pointer"
                >
                    {FONT_SIZES.map((opt) => (
                        <option key={opt.label} value={opt.value || ''}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                <div className="w-px h-4 bg-slate-200 mx-1" />

                <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                    <Bold className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <Italic className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                    <UnderlineIcon className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
                    <Strikethrough className="w-3.5 h-3.5" />
                </ToolbarButton>

                <div className="w-px h-4 bg-slate-200 mx-1" />

                <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                    <List className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                    <ListOrdered className="w-3.5 h-3.5" />
                </ToolbarButton>

                <div className="w-px h-4 bg-slate-200 mx-1" />

                <ToolbarButton title="Insert link" active={editor.isActive('link')} onClick={setLink}>
                    <LinkIcon className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Remove link" disabled={!editor.isActive('link')} onClick={() => editor.chain().focus().unsetLink().run()}>
                    <Unlink className="w-3.5 h-3.5" />
                </ToolbarButton>

                <div className="w-px h-4 bg-slate-200 mx-1" />

                <ToolbarButton title="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
                    <RemoveFormatting className="w-3.5 h-3.5" />
                </ToolbarButton>

                <div className="w-px h-4 bg-slate-200 mx-1" />

                <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
                    <Undo className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
                    <Redo className="w-3.5 h-3.5" />
                </ToolbarButton>
            </div>

            <EditorContent editor={editor} />
        </div>
    );
}
