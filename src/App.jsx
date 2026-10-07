import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import { ProtectedRoute, PublicRoute, PlatformAdminRoute, PermissionRoute } from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
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
import Lists from './pages/Lists';
import ImportContacts from './pages/ImportContacts';
import Tasks from './pages/Tasks';
import RecentlyDeleted from './pages/RecentlyDeleted';
import SalesDashboard from './pages/SalesDashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import SqlQueue from './pages/SqlQueue';
import Deals from './pages/Deals';
import DealDetail from './pages/DealDetail';
import Pipeline from './pages/Pipeline';
import SalesReports from './pages/SalesReports';
import SalesTeam from './pages/SalesTeam';
import SalesSettings from './pages/SalesSettings';
import SalesTargets from './pages/SalesTargets';
import TemplateLibrary from './pages/TemplateLibrary';
import Connections from './pages/Connections';
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
                        <Route path="dashboard" element={<Home />} />
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
                        <Route path="lists" element={<Lists />} />
                        <Route path="tasks" element={<Tasks />} />
                        <Route path="import" element={<PermissionRoute permission="manage_prospects"><ImportContacts /></PermissionRoute>} />
                        <Route path="sales" element={<SalesDashboard />} />
                        <Route path="leads" element={<Leads />} />
                        <Route path="leads/:id" element={<LeadDetail />} />
                        <Route path="sql-queue" element={<SqlQueue />} />
                        <Route path="deals" element={<Deals />} />
                        <Route path="deals/:id" element={<DealDetail />} />
                        <Route path="pipeline" element={<Pipeline />} />
                        <Route path="sales-reports" element={<SalesReports />} />
                        <Route path="sales-team" element={<SalesTeam />} />
                        <Route path="sales-settings" element={<SalesSettings />} />
                        <Route path="sales-targets" element={<SalesTargets />} />
                        <Route path="templates" element={<TemplateLibrary />} />
                        <Route path="connections" element={<Connections />} />
                        <Route path="recently-deleted" element={<PermissionRoute permission="manage_prospects"><RecentlyDeleted /></PermissionRoute>} />
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
