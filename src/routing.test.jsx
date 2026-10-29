// React Router features the app's route table (App.jsx) and layouts rely on: lazy pages under Suspense,
// relative index redirects, catch-all redirects, nested layouts with Outlet, NavLink active state,
// useNavigate with state, useSearchParams, and the ?next= return path through PublicRoute-style redirects.
import { lazy, Suspense } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { safeReturnPath } from './lib/returnTo';

function Where() {
    const location = useLocation();
    return <output data-testid="where">{location.pathname}{location.search}</output>;
}

function Shell() {
    return (
        <div>
            <nav>
                <NavLink to="/app/dashboard" end>Dashboard</NavLink>
                <NavLink to="/app/deals">Deals</NavLink>
            </nav>
            <Outlet />
            <Where />
        </div>
    );
}

function Deals() {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    return (
        <div>
            <p>deals stage {params.get('stage') || 'all'}</p>
            <p>from {location.state?.from || 'nowhere'}</p>
            <button type="button" onClick={() => setParams({ stage: 'won' })}>won</button>
            <button type="button" onClick={() => navigate('/app/deals/d-1', { state: { from: 'list' } })}>open</button>
        </div>
    );
}

function DealDetail() {
    const location = useLocation();
    const navigate = useNavigate();
    return (
        <div>
            <p>deal detail from {location.state?.from}</p>
            <button type="button" onClick={() => navigate(-1)}>back</button>
        </div>
    );
}

function Login() {
    const location = useLocation();
    const next = safeReturnPath(new URLSearchParams(location.search).get('next'));
    return next ? <Navigate to={next} replace /> : <p>login page</p>;
}

let resolveLazy;
const LazyReports = lazy(() => new Promise((resolve) => { resolveLazy = resolve; }));

function App({ path }) {
    return (
        <MemoryRouter initialEntries={[path]}>
            <Suspense fallback={<p>Loading…</p>}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/app" element={<Shell />}>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<p>dashboard page</p>} />
                        <Route path="deals" element={<Deals />} />
                        <Route path="deals/:id" element={<DealDetail />} />
                        <Route path="reports" element={<LazyReports />} />
                        <Route path="*" element={<p>not found</p>} />
                    </Route>
                    <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
                </Routes>
            </Suspense>
        </MemoryRouter>
    );
}

describe('routing', () => {
    it('redirects /app to the dashboard (relative index redirect) and marks the NavLink active', () => {
        render(<App path="/app" />);
        expect(screen.getByText('dashboard page')).toBeInTheDocument();
        expect(screen.getByTestId('where')).toHaveTextContent('/app/dashboard');
        expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'Deals' })).not.toHaveAttribute('aria-current');
    });

    it('sends unknown top-level paths to the dashboard and unknown /app paths to not found', () => {
        const { unmount } = render(<App path="/nope" />);
        expect(screen.getByText('dashboard page')).toBeInTheDocument();
        unmount();
        render(<App path="/app/nope" />);
        expect(screen.getByText('not found')).toBeInTheDocument();
    });

    it('navigates with links, search params, state and history back', async () => {
        render(<App path="/app/dashboard" />);
        await userEvent.click(screen.getByRole('link', { name: 'Deals' }));
        expect(screen.getByText('deals stage all')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'won' }));
        expect(screen.getByText('deals stage won')).toBeInTheDocument();
        expect(screen.getByTestId('where')).toHaveTextContent('/app/deals?stage=won');
        await userEvent.click(screen.getByRole('button', { name: 'open' }));
        expect(screen.getByText('deal detail from list')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'back' }));
        expect(screen.getByText('deals stage won')).toBeInTheDocument();
    });

    it('shows the Suspense fallback until a lazy page has loaded', async () => {
        render(<App path="/app/reports" />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
        await act(async () => { resolveLazy({ default: () => <p>reports page</p> }); });
        expect(await screen.findByText('reports page')).toBeInTheDocument();
    });

    it('follows an internal ?next= from the login page and ignores an external one', () => {
        const { unmount } = render(<App path="/login?next=%2Fapp%2Fdeals%3Fstage%3Dlost" />);
        expect(screen.getByText('deals stage lost')).toBeInTheDocument();
        unmount();
        render(<App path="/login?next=%2F%2Fevil.example%2Fapp" />);
        expect(screen.getByText('login page')).toBeInTheDocument();
    });
});
