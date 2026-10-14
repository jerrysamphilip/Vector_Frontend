import Loading from '../common/Loading';
import TeamMemberRow from './TeamMemberRow';
import { Search, Users } from 'lucide-react';

// Team members card: search + status filter toolbar and the members table.
export default function TeamMembersTable({ team }) {
    const {
        filteredUsers, search, setSearch, setStatusFilter, statusFilter, usersQuery
    } = team;
    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: '320ms' }}>

            {/* Toolbar */}
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                        <Users className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Team Members</p>
                        <p className="text-xs text-gray-400">{filteredUsers.length} member{filteredUsers.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search members…"
                            className="pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-52"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none text-gray-700"
                    >
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INVITED">Invited</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>
            </div>

            {usersQuery.isLoading ? (
                <Loading text="Loading team members..." size="md" />
            ) : usersQuery.isError ? (
                <div className="py-16 text-center">
                    <p className="text-sm text-rose-600">{usersQuery.error?.response?.data?.detail || 'Failed to load users'}</p>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf18, #73C8D218)' }}>
                        <Users className="w-6 h-6" style={{ color: '#2d6bbf' }} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">No members found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Member</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reports to</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Active</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((u, i) => (
                                <TeamMemberRow key={u.user_id} u={u} i={i} team={team} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
