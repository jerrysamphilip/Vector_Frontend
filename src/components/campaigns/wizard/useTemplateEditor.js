import { useState } from 'react';
import { useToast } from '../../ui/Toast';
import { campaignWizardApi } from '../../../api/campaignWizard';
import {
    formatEmailBodyForPreview, hasHtmlTags, hasSingleBraceTags, plainTextToHtml, substituteProspectData,
} from './emailPreview';

// Step 4: the selected persona's email sequence - pick an email, preview it with a sample prospect,
// edit the subject/body (saved to the backend) or regenerate either with AI.

/** Set `field` of email `stepNumber` of `persona`'s template in the processing result (mutates the nested email like before). */
function withEmailField(prev, persona, stepNumber, field, value) {
    const updated = { ...prev };
    const templateIdx = updated.templates_generated?.findIndex(t => t.persona_type === persona);
    if (templateIdx >= 0 && updated.templates_generated[templateIdx].all_emails) {
        const emailIdx = updated.templates_generated[templateIdx].all_emails.findIndex(
            e => e.step_number === stepNumber
        );
        if (emailIdx >= 0) {
            updated.templates_generated[templateIdx].all_emails[emailIdx][field] = value;
        }
    }
    return updated;
}

/**
 * @param {object} opts
 * @param {object|null} opts.processingResult
 * @param {Function} opts.setProcessingResult
 * @param {string|null} opts.selectedPersona
 * @param {object} opts.formData
 * @param {string} opts.customInstruction
 * @param {boolean} opts.creativeEmail
 * @param {Function} opts.setErrors
 */
export function useTemplateEditor({
    processingResult, setProcessingResult, selectedPersona, formData, customInstruction, creativeEmail, setErrors,
}) {
    const toast = useToast();
    const [showPreview, setShowPreview] = useState(false);
    const [selectedEmailStep, setSelectedEmailStep] = useState(1); // 1, 2, 3, or 4
    const [regenerating, setRegenerating] = useState(null); // 'subject' or 'body' or null
    const [editing, setEditing] = useState(null); // 'subject' or 'body' or null
    const [editValue, setEditValue] = useState('');

    const getSelectedTemplate = () =>
        processingResult?.templates_generated?.find(t => t.persona_type === selectedPersona);

    // Get specific email from sequence (1, 2, 3, or 4)
    const getSelectedEmailFromSequence = () => {
        const template = getSelectedTemplate();
        if (!template) return null;

        // Use all_emails if available (new format), otherwise fall back to template (old format)
        if (template.all_emails?.length > 0) {
            return template.all_emails.find(e => e.step_number === selectedEmailStep) || template.all_emails[0];
        }
        return template.template; // Backwards compatibility
    };

    const getSampleProspects = () =>
        processingResult?.sample_prospects?.[selectedPersona] || [];

    // Handle regenerating individual email subject or body
    const handleRegenerate = async (field) => {
        const email = getSelectedEmailFromSequence();
        if (!email?.template_id) {
            console.error('No template ID found');
            return;
        }

        setRegenerating(field);
        try {
            const result = await campaignWizardApi.regenerate(email.template_id, field, {
                campaign_description: formData.campaign_description,
                persona_type: selectedPersona,
                product_name: formData.campaign_name,
                cta_link: formData.cta_link,
                custom_instruction: customInstruction,
                creative_email: creativeEmail,
                step_number: selectedEmailStep,
            });

            // Update the local state with new content
            setProcessingResult(prev => withEmailField(prev, selectedPersona, selectedEmailStep, field, result.new_content));
        } catch (err) {
            console.error('Regenerate failed:', err);
            setErrors({ regenerate: err.response?.data?.detail || 'Failed to regenerate' });
        } finally {
            setRegenerating(null);
        }
    };

    // Start editing a field
    const handleEdit = (field) => {
        const email = getSelectedEmailFromSequence();
        if (email) {
            setEditing(field);

            if (field === 'body') {
                const bodyText = email.body || '';
                // The rich text editor works in HTML; wrap legacy plain-text bodies once.
                setEditValue(hasHtmlTags(bodyText) ? bodyText : plainTextToHtml(bodyText));
            } else {
                setEditValue(email[field] || '');
            }
        }
    };

    // Save edited field to local state and push to backend
    const handleSaveEdit = async (field) => {
        const email = getSelectedEmailFromSequence();
        if (!email?.template_id) {
            console.error('No template ID found');
            return;
        }

        const newContent = editValue;

        // Single Bracket Validation for Deliverability
        // Matches {tag} but not {{tag}}
        if (hasSingleBraceTags(newContent)) {
            toast.error('Please use double braces like {{first_name}} instead of {first_name} for personalization tags. Using single braces is frequently flagged by strict spam filters (like Proofpoint).', { title: 'Invalid custom variable format' });
            return;
        }

        try {
            // Push to backend
            await campaignWizardApi.updateTemplate(email.template_id, field, newContent);

            // Update local state
            setProcessingResult(prev => withEmailField(prev, selectedPersona, selectedEmailStep, field, newContent));

            setEditing(null);
            setEditValue('');
        } catch (error) {
            console.error('Failed to save template edits:', error);
            setErrors({ editTemplate: error.response?.data?.detail || 'Failed to save edits' });
        }
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setEditing(null);
        setEditValue('');
    };

    return {
        showPreview, setShowPreview,
        selectedEmailStep, setSelectedEmailStep,
        regenerating,
        editing, setEditing,
        editValue, setEditValue,
        getSelectedTemplate, getSelectedEmailFromSequence, getSampleProspects,
        handleRegenerate, handleEdit, handleSaveEdit, handleCancelEdit,
        // Preview helpers bound to the current sender details
        substituteProspectData: (text, prospect) => substituteProspectData(text, prospect, formData),
        formatEmailBodyForPreview: (body, prospect = null) => formatEmailBodyForPreview(body, prospect, formData),
    };
}
