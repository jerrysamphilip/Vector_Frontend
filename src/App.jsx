import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import { ProtectedRoute, PublicRoute, PlatformAdminRoute, PermissionRoute } from './components/auth/ProtectedRoute';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Home = lazy(() => import('./pages/Home'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const PlatformAdmin = lazy(() => import('./pages/PlatformAdmin'));
import Login from './pages/Login';
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AcceptInvite = lazy(() => import('./pages/AcceptInvite'));
const MagicLogin = lazy(() => import('./pages/MagicLogin'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const CreateCampaign = lazy(() => import('./pages/CreateCampaign'));
const CampaignDetails = lazy(() => import('./pages/CampaignDetails'));
const AIEmailGenerator = lazy(() => import('./pages/AIEmailGenerator'));
const Prospects = lazy(() => import('./pages/Prospects'));
const ProspectValidate = lazy(() => import('./pages/ProspectValidate'));
const Contacts = lazy(() => import('./pages/Contacts'));
const ContactDetail = lazy(() => import('./pages/ContactDetail'));
const Accounts = lazy(() => import('./pages/Accounts'));
const AccountDetail = lazy(() => import('./pages/AccountDetail'));
const Lists = lazy(() => import('./pages/Lists'));
const ImportContacts = lazy(() => import('./pages/ImportContacts'));
const Tasks = lazy(() => import('./pages/Tasks'));
const RecentlyDeleted = lazy(() => import('./pages/RecentlyDeleted'));
const SalesDashboard = lazy(() => import('./pages/SalesDashboard'));
const Leads = lazy(() => import('./pages/Leads'));
const LeadDetail = lazy(() => import('./pages/LeadDetail'));
const SqlQueue = lazy(() => import('./pages/SqlQueue'));
const Deals = lazy(() => import('./pages/Deals'));
const DealDetail = lazy(() => import('./pages/DealDetail'));
const Pipeline = lazy(() => import('./pages/Pipeline'));
const SalesReports = lazy(() => import('./pages/SalesReports'));
const SalesTeam = lazy(() => import('./pages/SalesTeam'));
const SalesSettings = lazy(() => import('./pages/SalesSettings'));
const SalesTargets = lazy(() => import('./pages/SalesTargets'));
const TemplateLibrary = lazy(() => import('./pages/TemplateLibrary'));
const Connections = lazy(() => import('./pages/Connections'));
const Reports = lazy(() => import('./pages/Reports'));
const DomainHealth = lazy(() => import('./pages/DomainHealth'));
const EmailAccounts = lazy(() => import('./pages/EmailAccounts'));
const Inbox = lazy(() => import('./pages/Inbox'));
const AutomationRules = lazy(() => import('./pages/AutomationRules'));
const TestAutomation = lazy(() => import('./pages/TestAutomation'));
const TeamManagement = lazy(() => import('./pages/TeamManagement'));
const SetPassword = lazy(() => import('./pages/SetPassword'));
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import HelpCenter from './pages/HelpCenter';
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
                <Suspense fallback={<div className="p-8 text-sm text-slate-400">Loading…</div>}>
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
                        <Route path="help" element={<HelpCenter />} />
                        <Route path="help/:articleId" element={<HelpCenter />} />
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
                        {import.meta.env.DEV && <Route path="test-automation" element={<TestAutomation />} />}
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
                </Suspense>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;
