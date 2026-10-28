// C-17 custom property safety in the UI: settings list with inactive properties, deactivate / reactivate,
// fixed data type, option labels with kept values, BOOLEAN / LONG_TEXT / max_length; record inputs show labels,
// store values and enforce max_length; server 400 messages are shown.
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomFieldsModal from './CustomFieldsModal';
import CompanyPropertiesModal from '../accounts/CompanyPropertiesModal';
import CompanyPropertiesCard from '../accounts/CompanyPropertiesCard';
import { CustomFieldInput, formatCustomValue } from './shared';
import { AccountFormModal } from '../../pages/Accounts';
import { fail, renderPage, reply } from '../../test/renderPage';
import { account, contactMeta } from '../../test/fixtures/crm';

const field = (id, extra = {}) => ({
    field_id: id, field_key: id, label: id, field_type: 'TEXT', options: [], choices: [], group_name: null, required: false,
    object_type: 'CONTACT', is_active: true, is_system: false, max_length: null, ...extra,
});
const STAGE = field('stage', { label: 'Stage', field_type: 'SELECT', options: ['mql', 'sql'],
    choices: [{ value: 'mql', label: 'Marketing qualified' }, { value: 'sql', label: 'Sales qualified' }] });
const OLD = field('budget', { label: 'Budget', field_type: 'NUMBER', is_active: false });
const SOURCE = field('source', { label: 'Source', is_system: true });

const requestsOf = (h, method, path) => h.requests.filter(r => r.method === method && r.path === path);

describe('property settings (contacts)', () => {
    const http = (over = {}) => ({
        'GET /contacts/fields': [STAGE, OLD, SOURCE],
        'PATCH /contacts/fields/:id': req => ({ ...STAGE, ...req.body }),
        'POST /contacts/fields': req => reply(201, field('new', req.body)),
        'DELETE /contacts/fields/:id': { status: 'deactivated' },
        ...over,
    });

    it('lists inactive properties (include_inactive) and reactivates them', async () => {
        const user = userEvent.setup();
        const { http: h } = renderPage(<CustomFieldsModal onClose={vi.fn()} />, { http: http() });
        const list = await screen.findByRole('list', { name: 'Properties' });
        expect(requestsOf(h, 'GET', '/contacts/fields')[0].query).toEqual({ include_inactive: 'true' });
        const budget = within(list).getByText('Budget').closest('li');
        expect(within(budget).getByText('Inactive')).toBeInTheDocument();
        expect(within(budget).queryByRole('button', { name: 'Deactivate Budget' })).toBeNull();
        expect(within(list).getByText(/Marketing qualified, Sales qualified/)).toBeInTheDocument(); // labels, not values
        await user.click(within(budget).getByRole('button', { name: 'Reactivate Budget' }));
        await waitFor(() => expect(requestsOf(h, 'PATCH', '/contacts/fields/budget')).toHaveLength(1));
        expect(requestsOf(h, 'PATCH', '/contacts/fields/budget')[0].body).toEqual({ label: 'Budget', group_name: null, required: false, is_active: true });
    });

    it('hides Deactivate for system properties and explains that values are kept', async () => {
        const user = userEvent.setup();
        const { http: h } = renderPage(<CustomFieldsModal onClose={vi.fn()} />, { http: http() });
        const list = await screen.findByRole('list', { name: 'Properties' });
        const source = within(list).getByText('Source').closest('li');
        expect(within(source).getByText('System')).toBeInTheDocument();
        expect(within(source).queryByRole('button', { name: /deactivate/i })).toBeNull();
        await user.click(within(list).getByRole('button', { name: 'Deactivate Stage' }));
        const ask = await screen.findByRole('dialog', { name: 'Deactivate "Stage"?' });
        expect(ask).toHaveTextContent('Values already saved on contacts are kept');
        await user.click(within(ask).getByRole('button', { name: 'Deactivate' }));
        await waitFor(() => expect(requestsOf(h, 'DELETE', '/contacts/fields/stage')).toHaveLength(1));
    });

    it('edits with the type locked; a renamed option keeps its value, a new one is sent as text', async () => {
        const user = userEvent.setup();
        const { http: h } = renderPage(<CustomFieldsModal onClose={vi.fn()} />, { http: http() });
        await user.click(await screen.findByRole('button', { name: 'Edit Stage' }));
        const editor = screen.getByRole('group', { name: 'Edit Stage' });
        expect(within(editor).getByRole('combobox', { name: /type/i })).toBeDisabled();
        const first = within(editor).getByRole('textbox', { name: 'Choice 1' });
        expect(first).toHaveValue('Marketing qualified');
        await user.clear(first);
        await user.type(first, 'MQL');
        await user.click(within(editor).getByRole('button', { name: 'Add choice' }));
        await user.type(within(editor).getByRole('textbox', { name: 'Choice 3' }), 'Customer');
        await user.click(within(editor).getByRole('button', { name: 'Save property' }));
        await waitFor(() => expect(requestsOf(h, 'PATCH', '/contacts/fields/stage')).toHaveLength(1));
        const body = requestsOf(h, 'PATCH', '/contacts/fields/stage')[0].body;
        expect(body).not.toHaveProperty('field_type');
        expect(body.options).toEqual([{ value: 'mql', label: 'MQL' }, { value: 'sql', label: 'Sales qualified' }, 'Customer']);
    });

    it('creates BOOLEAN and LONG_TEXT properties with a max_length within the limit', async () => {
        const user = userEvent.setup();
        const { http: h } = renderPage(<CustomFieldsModal onClose={vi.fn()} />, { http: http() });
        const editor = await screen.findByRole('group', { name: 'New property' });
        await user.type(within(editor).getByRole('textbox', { name: 'Label' }), 'Notes');
        await user.selectOptions(within(editor).getByRole('combobox', { name: /type/i }), 'LONG_TEXT');
        const max = within(editor).getByRole('spinbutton', { name: /maximum length/i });
        await user.type(max, '20000');
        expect(await within(editor).findByText('Enter a whole number from 1 to 10000')).toBeInTheDocument();
        expect(within(editor).getByRole('button', { name: /add property/i })).toBeDisabled();
        await user.clear(max);
        await user.type(max, '5000');
        await user.click(within(editor).getByRole('button', { name: /add property/i }));
        await waitFor(() => expect(requestsOf(h, 'POST', '/contacts/fields')).toHaveLength(1));
        expect(requestsOf(h, 'POST', '/contacts/fields')[0].body).toEqual({ label: 'Notes', field_type: 'LONG_TEXT', group_name: null, required: false, max_length: 5000 });

        await user.type(within(editor).getByRole('textbox', { name: 'Label' }), 'Opted in');
        await user.selectOptions(within(editor).getByRole('combobox', { name: /type/i }), 'BOOLEAN');
        expect(within(editor).queryByRole('spinbutton', { name: /maximum length/i })).toBeNull();
        await user.click(within(editor).getByRole('button', { name: /add property/i }));
        await waitFor(() => expect(requestsOf(h, 'POST', '/contacts/fields')).toHaveLength(2));
        expect(requestsOf(h, 'POST', '/contacts/fields')[1].body).toEqual({ label: 'Opted in', field_type: 'BOOLEAN', group_name: null, required: false });
    });

    it('shows the server message when a change is refused', async () => {
        const user = userEvent.setup();
        renderPage(<CompanyPropertiesModal onClose={vi.fn()} />, {
            http: {
                'GET /accounts/fields': [{ ...STAGE, object_type: 'COMPANY' }],
                'PATCH /accounts/fields/:id': fail(400, "A property's data type cannot be changed after it is created"),
            },
        });
        await user.click(await screen.findByRole('button', { name: 'Edit Stage' }));
        await user.click(screen.getByRole('button', { name: 'Save property' }));
        expect(await screen.findByText(/data type cannot be changed/)).toBeInTheDocument();
    });
});

describe('custom property values on records', () => {
    it('picks choices by label and stores the value', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<CustomFieldInput field={STAGE} value="" onChange={onChange} />);
        expect(screen.getByRole('option', { name: 'Sales qualified' })).toHaveValue('sql');
        await user.selectOptions(screen.getByRole('combobox'), 'Sales qualified');
        expect(onChange).toHaveBeenCalledWith('sql');
        const multi = { ...STAGE, field_type: 'MULTI_CHECKBOX' };
        render(<CustomFieldInput field={multi} value={['mql']} onChange={onChange} />);
        await user.click(screen.getByRole('checkbox', { name: 'Sales qualified' }));
        expect(onChange).toHaveBeenLastCalledWith(['mql', 'sql']);
    });

    it('edits BOOLEAN as Yes / No and LONG_TEXT in a textarea with its limit', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const flag = field('vip', { label: 'VIP', field_type: 'BOOLEAN' });
        const { unmount } = render(<CustomFieldInput field={flag} value={false} onChange={onChange} />);
        expect(screen.getByRole('combobox')).toHaveValue('false');
        await user.selectOptions(screen.getByRole('combobox'), 'Yes');
        expect(onChange).toHaveBeenCalledWith(true);
        unmount();
        render(<CustomFieldInput field={field('notes', { field_type: 'LONG_TEXT', max_length: 200 })} value="" onChange={onChange} />);
        expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '200');
        expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA');
    });

    it('formats labels, Yes / No and marks inactive properties on the company card', () => {
        expect(formatCustomValue(STAGE, 'sql')).toBe('Sales qualified');
        expect(formatCustomValue({ ...STAGE, field_type: 'MULTI_CHECKBOX' }, ['mql', 'gone'])).toBe('Marketing qualified, gone');
        expect(formatCustomValue({ field_type: 'BOOLEAN' }, false)).toBe('No');
        expect(formatCustomValue({ field_type: 'BOOLEAN' }, true)).toBe('Yes');
        render(<CompanyPropertiesCard properties={[STAGE, OLD]} values={{ stage: 'mql', budget: 5 }} />);
        expect(screen.getByText('Marketing qualified')).toBeInTheDocument();
        expect(screen.getByText('(inactive)')).toBeInTheDocument();
    });

    it('enforces max_length before saving a company and shows the server 400 message', async () => {
        const user = userEvent.setup();
        const code = field('code', { label: 'Code', max_length: 3, object_type: 'COMPANY' });
        const record = account('a-1', { name: 'Acme Corp', custom_fields: { code: 'TOOLONG' } });
        const { http: h } = renderPage(<AccountFormModal account={record} properties={[code, { ...OLD, object_type: 'COMPANY' }]} onClose={vi.fn()} onSaved={vi.fn()} />, {
            http: { 'GET /contacts/meta': contactMeta(), 'PATCH /accounts/:id': fail(400, "'Code' must be at most 3 characters") },
        });
        const dialog = await screen.findByRole('dialog', { name: 'Edit company' });
        expect(within(dialog).queryByText('Budget')).toBeNull(); // inactive properties are not edited
        await user.click(within(dialog).getByRole('button', { name: 'Save' }));
        expect(await within(dialog).findByText('Code must be at most 3 characters')).toBeInTheDocument();
        expect(requestsOf(h, 'PATCH', '/accounts/a-1')).toHaveLength(0);
        const input = within(dialog).getByDisplayValue('TOOLONG');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        await user.clear(input);
        await user.type(input, 'ABCD'); // maxLength stops at 3
        expect(input).toHaveValue('ABC');
        await user.click(within(dialog).getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(requestsOf(h, 'PATCH', '/accounts/a-1')).toHaveLength(1));
        expect(requestsOf(h, 'PATCH', '/accounts/a-1')[0].body.custom_fields).toEqual({ code: 'ABC' });
        expect(await within(dialog).findByText(/must be at most 3 characters \(Reference/)).toBeInTheDocument();
    });
});
