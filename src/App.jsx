import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StaleVersionBanner from './components/common/StaleVersionBanner';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './auth/AuthProvider';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { handleStaleVersionError } from './lib/staleVersion';
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
const CampaignEdit = lazy(() => import('./pages/CampaignEdit'));
const AIEmailGenerator = lazy(() => import('./pages/AIEmailGenerator'));
const Prospects = lazy(() => import('./pages/Prospects'));
const ProspectValidate = lazy(() => import('./pages/ProspectValidate'));
const Contacts = lazy(() => import('./pages/Contacts'));
const ContactDetail = lazy(() => import('./pages/ContactDetail'));
const Accounts = lazy(() => import('./pages/Accounts'));
const AccountDetail = lazy(() => import('./pages/AccountDetail'));
const Lists = lazy(() => import('./pages/Lists'));
const Duplicates = lazy(() => import('./pages/Duplicates'));
const ExportLogs = lazy(() => import('./pages/ExportLogs'));
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
const Webhooks = lazy(() => import('./pages/Webhooks'));
const ContactScoring = lazy(() => import('./pages/ContactScoring'));
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
const AccountSecurity = lazy(() => import('./pages/AccountSecurity'));
const AccountSettings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';

// 409 STALE_VERSION from any edit (rule T-3): refetch and show StaleVersionBanner
const mutationCache = new MutationCache({ onError: (error) => handleStaleVersionError(queryClient)(error) });

const queryClient = new QueryClient({
    mutationCache,
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
            <ToastProvider>
            <ConfirmProvider>
            <AuthProvider>
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
                        <Route path="campaigns/:id/edit" element={<PermissionRoute permission="manage_campaigns"><CampaignEdit /></PermissionRoute>} />
                        <Route path="ai-email" element={<AIEmailGenerator />} />
                        <Route path="prospects" element={<PermissionRoute permission="manage_prospects"><Prospects /></PermissionRoute>} />
                        <Route path="prospects/validate" element={<PermissionRoute permission="manage_prospects"><ProspectValidate /></PermissionRoute>} />
                        {/* Contacts & accounts: everyone sees the ones they own; manage_prospects sees all */}
                        <Route path="contacts" element={<Contacts />} />
                        <Route path="contacts/duplicates" element={<PermissionRoute permission="manage_prospects"><Duplicates /></PermissionRoute>} />
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
                        <Route path="webhooks" element={<Webhooks />} />
                        <Route path="contact-scoring" element={<ContactScoring />} />
                        <Route path="sales-targets" element={<SalesTargets />} />
                        <Route path="templates" element={<TemplateLibrary />} />
                        <Route path="connections" element={<Connections />} />
                        <Route path="account/security" element={<AccountSecurity />} />
                        {/* Profile (name) and password; /app/settings stays the campaign analytics alias the help links use */}
                        <Route path="account/profile" element={<AccountSettings />} />
                        <Route path="help" element={<HelpCenter />} />
                        <Route path="help/:articleId" element={<HelpCenter />} />
                        <Route path="recently-deleted" element={<PermissionRoute permission="manage_prospects"><RecentlyDeleted /></PermissionRoute>} />
                        <Route path="analytics" element={<PermissionRoute permission="view_analytics"><Dashboard /></PermissionRoute>} />
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
                        <Route path="settings/export-logs" element={<ExportLogs />} />
                        <Route path="*" element={<NotFound />} />
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
                        <Route path="tenants" element={<PlatformAdmin view="tenants" />} />
                        <Route path="users" element={<PlatformAdmin view="users" />} />
                        <Route path="security" element={<div className="p-8"><AccountSecurity /></div>} />
                    </Route>

                    {/* Catch all route - redirect to /app/dashboard */}
                    <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
                </Routes>
                </Suspense>
                <StaleVersionBanner />
            </BrowserRouter>
            </AuthProvider>
            </ConfirmProvider>
            </ToastProvider>
        </QueryClientProvider>
    );
}

export default App;
