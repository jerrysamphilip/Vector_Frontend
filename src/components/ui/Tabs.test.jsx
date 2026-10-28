import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

function Harness() {
    const [tab, setTab] = useState('preview');
    return (
        <Tabs value={tab} onValueChange={setTab}>
            <TabsList aria-label="Sections">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="history">Runs</TabsTrigger>
            </TabsList>
            <TabsContent value="preview">Preview body</TabsContent>
            <TabsContent value="history">Runs body</TabsContent>
        </Tabs>
    );
}

describe('Tabs (Radix)', () => {
    it('wires tablist / tab / tabpanel with aria-selected and labels', () => {
        render(<Harness />);
        expect(screen.getByRole('tablist', { name: 'Sections' })).toBeInTheDocument();
        const preview = screen.getByRole('tab', { name: 'Preview' });
        expect(preview).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: 'Runs' })).toHaveAttribute('aria-selected', 'false');
        expect(screen.getByRole('tabpanel', { name: 'Preview' })).toHaveTextContent('Preview body');
        expect(screen.queryByText('Runs body')).not.toBeInTheDocument();
    });

    it('switches on click', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('tab', { name: 'Runs' }));
        expect(screen.getByRole('tab', { name: 'Runs' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tabpanel', { name: 'Runs' })).toHaveTextContent('Runs body');
    });

    it('moves with the arrow keys (automatic activation)', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.tab();
        expect(screen.getByRole('tab', { name: 'Preview' })).toHaveFocus();
        await user.keyboard('{ArrowRight}');
        expect(screen.getByRole('tab', { name: 'Runs' })).toHaveFocus();
        expect(screen.getByRole('tabpanel')).toHaveTextContent('Runs body');
        await user.keyboard('{ArrowLeft}');
        expect(screen.getByRole('tabpanel')).toHaveTextContent('Preview body');
    });
});
