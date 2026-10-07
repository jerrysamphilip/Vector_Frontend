import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import { ProtectedRoute, PublicRoute, PlatformAdminRoute, PermissionRoute } from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import PlatformAdmin from './pages/PlatformAdmin';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AcceptInvite from './pages/AcceptInvite';
import MagicLogin from './pages/MagicLogin';
import Campaigns from './pages/Campaigns';
import CreateCampaign from './pages/CreateCampaign';
import CampaignDetails from './pages/CampaignDetails';
import AIEmailGenerator from './pages/AIEmailGenerator';
import Prospects from './pages/Prospects';
import ProspectValidate from './pages/ProspectValidate';
import Contacts from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import Accounts from './pages/Accounts';
import AccountDetail from './pages/AccountDetail';
import Reports from './pages/Reports';
import DomainHealth from './pages/DomainHealth';
import EmailAccounts from './pages/EmailAccounts';
import Inbox from './pages/Inbox';
import AutomationRules from './pages/AutomationRules';
import TestAutomation from './pages/TestAutomation';
import TeamManagement from './pages/TeamManagement';
import SetPassword from './pages/SetPassword';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30000,
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
                <Routes>
                    {/* Add redirect from / to /app/dashboard */}
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route
                        path="/login"
                        element={(
                            <PublicRoute>
                                <Login />
                            </PublicRoute>
                        )}
                    />
                    <Route
                        path="/forgot-password"
                        element={(
                            <PublicRoute>
                                <ForgotPassword />
                            </PublicRoute>
                        )}
                    />
                    <Route
                        path="/reset-password"
                        element={<ResetPassword />}
                    />
                    <Route
                        path="/accept-invite"
                        element={(
                            <PublicRoute>
                                <AcceptInvite />
                            </PublicRoute>
                        )}
                    />
                    <Route
                        path="/magic-login"
                        element={<MagicLogin />}
                    />
                    <Route
                        path="/set-password"
                        element={(
                            <ProtectedRoute>
                                <SetPassword />
                            </ProtectedRoute>
                        )}
                    />

                    {/* Wrap application routes with /app prefix */}
                    <Route
                        path="/app"
                        element={(
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        )}
                    >
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="campaigns" element={<PermissionRoute permission="manage_campaigns"><Campaigns /></PermissionRoute>} />
                        <Route path="campaigns/new" element={<PermissionRoute permission="manage_campaigns"><CreateCampaign /></PermissionRoute>} />
                        <Route path="campaigns/:id" element={<PermissionRoute permission="manage_campaigns"><CampaignDetails /></PermissionRoute>} />
                        <Route path="ai-email" element={<AIEmailGenerator />} />
                        <Route path="prospects" element={<PermissionRoute permission="manage_prospects"><Prospects /></PermissionRoute>} />
                        <Route path="prospects/validate" element={<PermissionRoute permission="manage_prospects"><ProspectValidate /></PermissionRoute>} />
                        {/* Contacts & accounts: everyone sees the ones they own; manage_prospects sees all */}
                        <Route path="contacts" element={<Contacts />} />
                        <Route path="contacts/:id" element={<ContactDetail />} />
                        <Route path="accounts" element={<Accounts />} />
                        <Route path="accounts/:id" element={<AccountDetail />} />
                        <Route path="analytics" element={<Dashboard />} />
                        <Route
                            path="reports"
                            element={(
                                <PermissionRoute permission="view_analytics">
                                    <ErrorBoundary>
                                        <Reports />
                                    </ErrorBoundary>
                                </PermissionRoute>
                            )}
                        />
                        <Route path="domain-health" element={<DomainHealth />} />

                        <Route path="inboxes" element={<PermissionRoute permission="manage_inboxes"><EmailAccounts /></PermissionRoute>} />
                        <Route path="inbox" element={<Inbox />} />
                        <Route path="automation" element={<AutomationRules />} />
                        <Route path="team" element={<PermissionRoute permission="manage_team"><TeamManagement /></PermissionRoute>} />
                        <Route path="test-automation" element={<TestAutomation />} />
                        <Route path="settings" element={<Dashboard />} />
                    </Route>

                    {/* Platform Admin routes — separate layout */}
                    <Route
                        path="/admin"
                        element={(
                            <PlatformAdminRoute>
                                <AdminLayout />
                            </PlatformAdminRoute>
                        )}
                    >
                        <Route index element={<PlatformAdmin />} />
                        <Route path="tenants" element={<PlatformAdmin />} />
                        <Route path="users" element={<PlatformAdmin />} />
                    </Route>

                    {/* Catch all route - redirect to /app/dashboard */}
                    <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;
