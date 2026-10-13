// Contact scoring on fit and engagement (BR-CM-43, CM-083): rule-based, no AI

import { apiClient as api } from './http';

export const scoringApi = {
    // Workspace scoring model (admins)
    model: async () => (await api.get('/contacts/scoring-model')).data,
    saveModel: async (model) => (await api.put('/contacts/scoring-model', model)).data,
    recompute: async () => (await api.post('/contacts/scoring-model/recompute')).data,
    // One contact: stored score and the live breakdown
    contactScore: async (id) => (await api.get(`/contacts/${id}/score`)).data,
    recomputeContact: async (id) => (await api.post(`/contacts/${id}/score/recompute`)).data,
};

export const GRADES = ['A', 'B', 'C', 'D'];

export const GRADE_TONES = {
    A: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    B: 'bg-sky-100 text-sky-800 border-sky-200',
    C: 'bg-amber-100 text-amber-800 border-amber-200',
    D: 'bg-slate-100 text-slate-600 border-slate-200',
};
