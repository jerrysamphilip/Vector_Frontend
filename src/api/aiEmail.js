import { apiClient as api } from './http';

// AI Email Generation API
export const aiEmailApi = {
    // Test classification (no DB save)
    classifyTest: async (designation, companyName = null) => {
        const response = await api.post('/prospects/classifications/test', {
            designation,
            company_name: companyName,
        });
        return response.data;
    },

    // Classify batch of prospects
    classifyBatch: async (prospectIds) => {
        const response = await api.post('/prospects/classifications/batch', {
            prospect_ids: prospectIds,
        });
        return response.data;
    },

    // Generate email for prospect
    generateEmail: async (prospectId, productName = 'Our Product') => {
        const response = await api.post('/emails/generations', {
            prospect_id: prospectId,
            product_name: productName,
        });
        return response.data;
    },

    // Generate 3-email sequence for prospect
    generateSequence: async (prospectId, productName, productDescription = '', useLlm = true) => {
        const response = await api.post('/emails/sequences/generations', {
            prospect_id: prospectId,
            product_name: productName,
            product_description: productDescription,
            use_llm: useLlm,
        });
        return response.data;
    },

    // Check content for spam/compliance
    checkCompliance: async (subject, body) => {
        const response = await api.post('/emails/compliance-checks', {
            subject,
            body,
        });
        return response.data;
    },

    // Validate if email is business (not personal)
    validateEmail: async (email) => {
        const response = await api.post('/emails/validations', {
            email,
        });
        return response.data;
    },

    // Get CTA options by purpose
    getCtaOptions: async (purpose) => {
        const response = await api.get(`/emails/cta-options/${purpose}`);
        return response.data;
    },

    // List all blueprints
    getBlueprints: async (activeOnly = true) => {
        const response = await api.get('/persona-blueprints', {
            params: { active_only: activeOnly },
        });
        return response.data;
    },

    // Get specific blueprint
    getBlueprint: async (personaType) => {
        const response = await api.get(`/persona-blueprints/${personaType}`);
        return response.data;
    },

    // Create new blueprint
    createBlueprint: async (data) => {
        const response = await api.post('/persona-blueprints', data);
        return response.data;
    },
};

export default aiEmailApi;

