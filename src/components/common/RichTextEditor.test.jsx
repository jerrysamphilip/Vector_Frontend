// RichTextEditor (TipTap): HTML in/out via value/onChange, toolbar marks and lists, links, external value sync.
import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RichTextEditor from './RichTextEditor';

/** The TipTap editor behind the rendered ProseMirror element (TipTap sets view.dom.editor). */
async function getEditor(container) {
    let dom;
    await waitFor(() => {
        dom = container.querySelector('.ProseMirror');
        expect(dom).toBeTruthy();
        expect(dom.editor).toBeTruthy();
    });
    return dom.editor;
}

function Controlled({ initial = '', onChange }) {
    const [value, setValue] = useState(initial);
    return (
        <>
            <RichTextEditor value={value} onChange={(html) => { setValue(html); onChange?.(html); }} />
            <button type="button" onClick={() => setValue('<p>Regenerated <strong>body</strong></p>')}>regen</button>
            <output data-testid="value">{value}</output>
        </>
    );
}

describe('RichTextEditor', () => {
    it('renders the given HTML and round-trips it through getHTML unchanged', async () => {
        const html = '<p>Hi <strong>Ann</strong>, <em>quick</em> <u>note</u> <s>old</s></p>'
            + '<ul><li><p>one</p></li></ul><ol><li><p>two</p></li></ol>'
            + '<p><a target="_blank" rel="noopener noreferrer" href="https://example.com">link</a></p>';
        const { container } = render(<RichTextEditor value={html} onChange={() => {}} />);
        const editor = await getEditor(container);
        expect(editor.getHTML()).toBe(html);
        expect(container.querySelector('.ProseMirror strong')).toHaveTextContent('Ann');
    });

    it('keeps font size and family from the text-style extension', async () => {
        const html = '<p><span style="font-family: Georgia, serif; font-size: 18px;">styled</span></p>';
        const { container } = render(<RichTextEditor value={html} onChange={() => {}} />);
        const editor = await getEditor(container);
        expect(editor.getHTML()).toContain('font-size: 18px');
        expect(editor.getHTML()).toContain('font-family: Georgia, serif');
    });

    it('drops script and event handlers from pasted/loaded HTML (schema only keeps known nodes and marks)', async () => {
        const { container } = render(<RichTextEditor value={'<p onclick="x()">a</p><script>alert(1)</script><img src=x onerror="alert(1)">'} onChange={() => {}} />);
        const editor = await getEditor(container);
        expect(editor.getHTML()).toBe('<p>a</p>');
    });

    it('emits the HTML on edits, and the toolbar applies bold and lists', async () => {
        const onChange = vi.fn();
        const { container } = render(<Controlled initial="<p>hello</p>" onChange={onChange} />);
        const editor = await getEditor(container);

        act(() => { editor.commands.selectAll(); });
        fireEvent.click(screen.getByTitle('Bold'));
        expect(onChange).toHaveBeenLastCalledWith('<p><strong>hello</strong></p>');

        // StarterKit's TrailingNode keeps an empty paragraph after a list that ends the document
        fireEvent.click(screen.getByTitle('Bullet list'));
        expect(onChange).toHaveBeenLastCalledWith('<ul><li><p><strong>hello</strong></p></li></ul><p></p>');
        expect(screen.getByTestId('value').textContent).toBe('<ul><li><p><strong>hello</strong></p></li></ul><p></p>');

        fireEvent.click(screen.getByTitle('Undo'));
        expect(onChange).toHaveBeenLastCalledWith('<p><strong>hello</strong></p>');
    });

    it('inserts a link from the prompt with rel=noopener, and removes it with an empty URL', async () => {
        const onChange = vi.fn();
        const { container } = render(<Controlled initial="<p>site</p>" onChange={onChange} />);
        const editor = await getEditor(container);
        const prompt = vi.spyOn(window, 'prompt').mockReturnValue('https://example.com/a');

        act(() => { editor.commands.selectAll(); });
        fireEvent.click(screen.getByTitle('Insert link'));
        expect(prompt).toHaveBeenCalledWith('Link URL', 'https://');
        const linked = onChange.mock.calls.at(-1)[0];
        expect(linked).toContain('href="https://example.com/a"');
        expect(linked).toContain('rel="noopener noreferrer"');

        prompt.mockReturnValue('');
        act(() => { editor.commands.selectAll(); });
        fireEvent.click(screen.getByTitle('Insert link'));
        expect(onChange).toHaveBeenLastCalledWith('<p>site</p>');
    });

    it('registers Link and Underline once, with this editor\'s link options', async () => {
        const warn = vi.spyOn(console, 'warn');
        const { container } = render(<RichTextEditor value="<p>x</p>" onChange={() => {}} />);
        const editor = await getEditor(container);
        const links = editor.extensionManager.extensions.filter((e) => e.name === 'link');
        expect(links).toHaveLength(1);
        expect(links[0].options.openOnClick).toBe(false);
        expect(editor.extensionManager.extensions.filter((e) => e.name === 'underline')).toHaveLength(1);
        expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Duplicate extension'));
    });

    it('refuses javascript: links', async () => {
        const onChange = vi.fn();
        const { container } = render(<Controlled initial="<p>x</p>" onChange={onChange} />);
        const editor = await getEditor(container);
        vi.spyOn(window, 'prompt').mockReturnValue('javascript:alert(1)');
        act(() => { editor.commands.selectAll(); });
        fireEvent.click(screen.getByTitle('Insert link'));
        expect(editor.getHTML()).not.toContain('javascript:');
    });

    it('takes a new value from outside (AI regenerate) without echoing it through onChange', async () => {
        const onChange = vi.fn();
        const { container } = render(<Controlled initial="<p>first</p>" onChange={onChange} />);
        const editor = await getEditor(container);
        fireEvent.click(screen.getByText('regen'));
        await waitFor(() => expect(editor.getHTML()).toBe('<p>Regenerated <strong>body</strong></p>'));
        expect(onChange).not.toHaveBeenCalled();
    });
});
