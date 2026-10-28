import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './DropdownMenu';

function Menu({ onRename = () => {}, onDelete = () => {} }) {
    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><button>Actions</button></DropdownMenuTrigger>
                <DropdownMenuContent aria-label="Campaign actions">
                    <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
                    <DropdownMenuItem onSelect={onDelete}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <button>Elsewhere</button>
        </>
    );
}

describe('DropdownMenu (Radix)', () => {
    it('opens on click with menu roles and aria-expanded', async () => {
        const user = userEvent.setup();
        render(<Menu />);
        const trigger = screen.getByRole('button', { name: 'Actions' });
        expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await user.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('menu', { name: 'Campaign actions' })).toBeInTheDocument();
        expect(screen.getAllByRole('menuitem').map(i => i.textContent)).toEqual(['Rename', 'Delete']);
    });

    it('selects an item by click, closes and returns focus to the trigger', async () => {
        const user = userEvent.setup();
        const onDelete = vi.fn();
        render(<Menu onDelete={onDelete} />);
        const trigger = screen.getByRole('button', { name: 'Actions' });
        await user.click(trigger);
        await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
        expect(onDelete).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    it('works from the keyboard: Enter opens, arrows move, Enter selects, Escape closes', async () => {
        const user = userEvent.setup();
        const onRename = vi.fn();
        const onDelete = vi.fn();
        render(<Menu onRename={onRename} onDelete={onDelete} />);
        const trigger = screen.getByRole('button', { name: 'Actions' });
        trigger.focus();
        await user.keyboard('{Enter}');
        expect(screen.getByRole('menuitem', { name: 'Rename' })).toHaveFocus();
        await user.keyboard('{ArrowDown}');
        expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
        expect(onDelete).not.toHaveBeenCalled();
        await user.keyboard('{ArrowDown}');
        await user.keyboard('{Enter}');
        expect(onRename).toHaveBeenCalledTimes(1);
    });

    it('closes on a click outside', async () => {
        const user = userEvent.setup();
        render(<Menu />);
        await user.click(screen.getByRole('button', { name: 'Actions' }));
        await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
});
