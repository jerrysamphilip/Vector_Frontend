import { Outlet } from 'react-router-dom';
import Sidebar, { ProfileMenu } from './Sidebar';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import NewMenu from './NewMenu';

export default function Layout() {
    return (
        <div className="min-h-screen bg-[#F7F9FC] font-sans text-slate-900">
            <Sidebar />
            <div className="ml-60 min-w-0 flex flex-col min-h-screen">
                <header className="sticky top-0 z-30 h-14 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center gap-3 px-7">
                    <div className="flex-1 max-w-xl"><GlobalSearch /></div>
                    <div className="flex-1" />
                    <NewMenu />
                    <NotificationBell />
                    <ProfileMenu />
                </header>
                <main className="flex-1 min-w-0">
                    <div className="max-w-[1600px] mx-auto px-7 py-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
