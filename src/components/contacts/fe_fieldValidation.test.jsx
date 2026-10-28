// F-07 / F-08 in the forms: inline errors with aria-invalid / aria-describedby, keystroke filters, normalised
// payloads, and the server's 422 field errors shown next to their fields.
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactFormModal from './ContactFormModal';
import { AccountFormModal } from '../../pages/Accounts';
import SenderDetailsSection from '../campaigns/wizard/SenderDetailsSection';
import { renderPage, reply } from '../../test/renderPage';
import { contactMeta } from '../../test/fixtures/crm';

const META = { 'GET /contacts/meta': contactMeta() };

function describedText(input) {
    return (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean)
        .map(id => document.getElementById(id)?.textContent).join(' ');
}

describe('contact create form', () => {
    it('shows inline errors on submit, focuses the first invalid field and sends nothing', async () => {
        const user = userEvent.setup();
        const { http } = renderPage(<ContactFormModal onClose={() => {}} canAssign={false} />, { http: META });
        await user.type(screen.getByLabelText('First name'), 'Ada');
        await user.type(screen.getByLabelText('LinkedIn'), 'http://linkedin.com/in/ada');
        await user.click(screen.getByRole('button', { name: /Add contact/ }));
        const email = screen.getByLabelText('Email *');
        expect(email).toHaveAttribute('aria-invalid', 'true');
        expect(describedText(email)).toMatch(/Email is required/);
        expect(email).toHaveFocus();
        const linkedin = screen.getByLabelText('LinkedIn');
        expect(linkedin).toHaveAttribute('aria-invalid', 'true');
        expect(describedText(linkedin)).toMatch(/https:\/\//);
        expect(screen.getByLabelText('First name')).not.toHaveAttribute('aria-invalid');
        expect(http.requests.filter(r => r.method === 'POST')).toHaveLength(0);
    });

    it('checks a field on blur and clears the error as soon as it is fixed', async () => {
        const user = userEvent.setup();
        renderPage(<ContactFormModal onClose={() => {}} canAssign={false} />, { http: META });
        const phone = screen.getByLabelText('Phone');
        await user.type(phone, '12345');
        await user.tab();
        expect(phone).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByRole('alert')).toHaveTextContent(/too short/);
        await user.type(phone, '678');
        expect(phone).not.toHaveAttribute('aria-invalid');
    });

    it('filters keystrokes, caps the length and sends normalised values', async () => {
        const user = userEvent.setup();
        const onCreated = vi.fn();
        const { http } = renderPage(<ContactFormModal onClose={() => {}} onCreated={onCreated} canAssign={false} />, {
            http: { ...META, 'POST /contacts': reply(201, { prospect_id: 'p-1' }) },
        });
        await user.type(screen.getByLabelText('Phone'), '+44 (20) 7946-0958abc');
        expect(screen.getByLabelText('Phone')).toHaveValue('+44 (20) 7946-0958');
        expect(screen.getByLabelText('First name')).toHaveAttribute('maxLength', '100');
        await user.type(screen.getByLabelText('Email *'), 'Ada@ACME.com');
        await user.type(screen.getByLabelText('Country'), 'uk');
        await user.click(screen.getByRole('button', { name: /Add contact/ }));
        await waitFor(() => expect(onCreated).toHaveBeenCalled());
        const body = http.requests.find(r => r.method === 'POST').body;
        expect(body).toMatchObject({ email: 'Ada@acme.com', phone: '+442079460958', poc_country: 'United Kingdom' });
    });

    it('puts the server 422 field errors next to their fields', async () => {
        const user = userEvent.setup();
        renderPage(<ContactFormModal onClose={() => {}} canAssign={false} />, {
            http: { ...META, 'POST /contacts': reply(422, { detail: [{ loc: ['body', 'email'], msg: 'Value error, this domain does not accept mail' }] }) },
        });
        await user.type(screen.getByLabelText('Email *'), 'ada@acme.com');
        await user.click(screen.getByRole('button', { name: /Add contact/ }));
        const email = screen.getByLabelText('Email *');
        await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
        expect(describedText(email)).toBe('this domain does not accept mail');
    });
});

describe('company form', () => {
    it('validates domain, website, postal code by country and revenue before saving', async () => {
        const user = userEvent.setup();
        const { http } = renderPage(<AccountFormModal onClose={() => {}} onSaved={() => {}} />, { http: META });
        await user.type(screen.getByLabelText('Name *'), 'Acme');
        await user.type(screen.getByLabelText('Domain'), 'acme');
        await user.type(screen.getByLabelText('Website'), 'javascript:alert(1)');
        await user.type(screen.getByLabelText('Country'), 'United States');
        await user.type(screen.getByLabelText('Postal code'), '9410');
        await user.type(screen.getByLabelText('Annual revenue (USD)'), '12.345');
        await user.click(screen.getByRole('button', { name: 'Create company' }));
        for (const [label, text] of [['Domain', /acme.com/], ['Website', /web link/], ['Postal code', /12345/], ['Annual revenue (USD)', /2 decimals/]]) {
            const input = screen.getByLabelText(label);
            expect(input, label).toHaveAttribute('aria-invalid', 'true');
            expect(describedText(input), label).toMatch(text);
        }
        expect(screen.getByLabelText('Domain')).toHaveFocus();
        expect(http.requests.filter(r => r.method === 'POST')).toHaveLength(0);
    });

    it('sends normalised values', async () => {
        const user = userEvent.setup();
        const onSaved = vi.fn();
        const { http } = renderPage(<AccountFormModal onClose={() => {}} onSaved={onSaved} />, {
            http: { ...META, 'POST /accounts': reply(201, { account_id: 'a-1' }) },
        });
        await user.type(screen.getByLabelText('Name *'), '  Acme  ');
        await user.type(screen.getByLabelText('Domain'), 'https://www.ACME.com/');
        await user.type(screen.getByLabelText('Website'), 'acme.com');
        await user.type(screen.getByLabelText('Country'), 'ca');
        await user.type(screen.getByLabelText('State'), 'ontario');
        await user.type(screen.getByLabelText('Postal code'), 'k1a0b1');
        await user.type(screen.getByLabelText('Annual revenue (USD)'), '2,500,000');
        await user.click(screen.getByRole('button', { name: 'Create company' }));
        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect(http.requests.find(r => r.method === 'POST').body).toMatchObject({
            name: 'Acme', domain: 'acme.com', website: 'https://acme.com', country: 'Canada', state: 'ON', postal_code: 'K1A 0B1', annual_revenue: '2500000',
        });
    });
});

describe('campaign wizard sender details', () => {
    function Harness({ initial = {}, initialErrors = {} }) {
        const [formData, setFormData] = useState({ sender_name: '', sender_title: '', cta_link: '', ...initial });
        const [errors, setErrors] = useState(initialErrors);
        return <SenderDetailsSection wizard={{ formData, setFormData, errors, setErrors }} />;
    }

    it('requires a full https CTA link, checked on blur', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const cta = screen.getByLabelText('CTA / Booking Link');
        await user.type(cta, 'http://calendly.com/ada');
        await user.tab();
        expect(cta).toHaveAttribute('aria-invalid', 'true');
        expect(describedText(cta)).toMatch(/must start with https:\/\//);
        await user.clear(cta);
        await user.type(cta, 'https://calendly.com/ada');
        expect(cta).not.toHaveAttribute('aria-invalid');
    });

    it('rejects template braces in the sender name and caps the lengths', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const name = screen.getByLabelText('Sender Name');
        expect(name).toHaveAttribute('maxLength', '100');
        expect(screen.getByLabelText('Sender Title')).toHaveAttribute('maxLength', '150');
        await user.type(name, 'Ada {{x}}');
        await user.tab();
        expect(name).toHaveAttribute('aria-invalid', 'true');
    });

    it('shows a server field error passed in through the wizard errors', () => {
        render(<Harness initialErrors={{ cta_link: 'Link is not reachable' }} />);
        expect(describedText(screen.getByLabelText('CTA / Booking Link'))).toMatch(/Link is not reachable/);
    });
});
