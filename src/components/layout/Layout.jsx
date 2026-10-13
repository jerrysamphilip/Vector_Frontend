import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import PageErrorBoundary from '../common/PageErrorBoundary';
import Sidebar, { ProfileMenu } from './Sidebar';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import NewMenu from './NewMenu';
import { useNavDrawer } from './useNavDrawer';
import { HelpProvider } from '../../help/HelpPanel';
import HelpButton from '../../help/HelpButton';

export default function Layout() {
    const { pathname } = useLocation();
    const drawer = useNavDrawer();
    return (
        <HelpProvider>
        <div className="min-h-screen bg-[#F7F9FC] font-sans text-slate-900">
            <Sidebar drawer={drawer} />
            {/* lg+: fixed 240px sidebar; below lg the sidebar is a drawer and the content takes the full width */}
            <div className="lg:ml-60 min-w-0 flex flex-col min-h-screen">
                <header className="sticky top-0 z-30 h-14 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 lg:px-7">
                    <button type="button" ref={drawer.toggleRef} onClick={drawer.openDrawer}
                        aria-label="Open navigation menu" aria-expanded={drawer.open} aria-controls="app-sidebar"
                        className="lg:hidden h-9 w-9 shrink-0 -ml-1 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0 max-w-xl"><GlobalSearch /></div>
                    <div className="hidden sm:block flex-1" />
                    <NewMenu />
                    <HelpButton />
                    <NotificationBell />
                    <ProfileMenu />
                </header>
                <main className="flex-1 min-w-0">
                    <div className="max-w-[1600px] mx-auto px-4 sm:px-5 lg:px-7 py-5 lg:py-6">
                        <PageErrorBoundary key={pathname}><Outlet /></PageErrorBoundary>
                    </div>
                </main>
            </div>
        </div>
        </HelpProvider>
    );
}
