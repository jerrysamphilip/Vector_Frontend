import { apiV1Client } from './http';

const usersApi = {
    listUsers: async () => {
        const response = await apiV1Client.get('/users');
        return response.data;
    },

    inviteUser: async (payload) => {
        const response = await apiV1Client.post('/users/invite', payload);
        return response.data;
    },

    changeRole: async (userId, role) => {
        const response = await apiV1Client.put(`/users/${userId}/role`, { role });
        return response.data;
    },

    deactivateUser: async (userId) => {
        const response = await apiV1Client.delete(`/users/${userId}`);
        return response.data;
    },

    reactivateUser: async (userId) => {
        const response = await apiV1Client.put(`/users/${userId}/reactivate`);
        return response.data;
    },

    permanentDeleteUser: async (userId) => {
        const response = await apiV1Client.delete(`/users/${userId}/permanent`);
        return response.data;
    },

    listInvitations: async () => {
        const response = await apiV1Client.get('/users/invitations');
        return response.data;
    },

    revokeInvitation: async (invitationId) => {
        const response = await apiV1Client.delete(`/users/invitations/${invitationId}`);
        return response.data;
    },

    acceptInvite: async (payload) => {
        const response = await apiV1Client.post('/users/accept-invite', payload, { skipAuth: true });
        return response.data;
    },

    getPermissions: async (userId) => {
        const response = await apiV1Client.get(`/users/${userId}/permissions`);
        return response.data;
    },

    updatePermissions: async (userId, permissions) => {
        const response = await apiV1Client.put(`/users/${userId}/permissions`, { permissions });
        return response.data;
    },

    resetPermissions: async (userId) => {
        const response = await apiV1Client.delete(`/users/${userId}/permissions`);
        return response.data;
    },
};

export default usersApi;
