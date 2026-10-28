import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input, Label, Select, Textarea } from './Input';

describe('Input / Select / Textarea accessibility (F-24)', () => {
    it('is not marked invalid without an error', () => {
        render(<><Label htmlFor="email">Email</Label><Input id="email" /></>);
        const input = screen.getByLabelText('Email');
        expect(input).not.toHaveAttribute('aria-invalid');
        expect(input).not.toHaveAttribute('aria-describedby');
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('wires aria-invalid and aria-describedby to the error text (role=alert)', () => {
        render(<><Label htmlFor="email">Email</Label><Input id="email" error="Enter a valid email" hint="Your work address" /></>);
        const input = screen.getByLabelText('Email');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAccessibleDescription('Your work address Enter a valid email');
        expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
    });

    it('keeps a caller aria-describedby and works without an id', () => {
        render(<><p id="extra">Extra help</p><Input aria-label="Name" aria-describedby="extra" error="Required" /></>);
        const input = screen.getByLabelText('Name');
        expect(input).toHaveAccessibleDescription('Extra help Required');
    });

    it('does the same for Select and Textarea', () => {
        render(<>
            <Select aria-label="Country" error="Pick a country"><option value="">—</option></Select>
            <Textarea aria-label="Notes" error="Too long" />
        </>);
        expect(screen.getByLabelText('Country')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Country')).toHaveAccessibleDescription('Pick a country');
        expect(screen.getByLabelText('Notes')).toHaveAccessibleDescription('Too long');
        expect(screen.getAllByRole('alert')).toHaveLength(2);
    });
});
