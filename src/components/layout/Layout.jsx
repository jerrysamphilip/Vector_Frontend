import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
    return (
        <div className="min-h-screen bg-[#F7F9FC] font-sans text-slate-900 flex">
            {/* 1. Fixed Sidebar */}
            <Sidebar />

            {/* 2. Main Content Area */}
            {/* ml-64 to offset the fixed 16rem (64) sidebar */}
            <main className="flex-1 ml-64 min-h-screen min-w-0 overflow-hidden">
                <div className="max-w-[1600px] mx-auto p-8">
                    {/* 3. Page Content */}
                    <div className="animate-in fade-in duration-300 slide-in-from-bottom-2">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}
