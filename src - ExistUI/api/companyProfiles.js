// Frontend API helpers for company profiles
// Backend route has "/api/company-profiles" prefix, so use apiV1Client.
import { apiV1Client } from './http';

const API_BASE = '/company-profiles';

export async function getCompanyProfiles() {
    const response = await apiV1Client.get(API_BASE);
    return response.data;
}

export async function createCompanyProfile(data) {
    const response = await apiV1Client.post(API_BASE, data);
    return response.data;
}

export async function updateCompanyProfile(profileId, data) {
    const response = await apiV1Client.put(`${API_BASE}/${profileId}`, data);
    return response.data;
}

export async function deleteCompanyProfile(profileId) {
    const response = await apiV1Client.delete(`${API_BASE}/${profileId}`);
    return response.data;
}
