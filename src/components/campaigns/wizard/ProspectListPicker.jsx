import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, ChevronDown, Search } from 'lucide-react';

// Step 3: searchable single-select dropdown of the existing prospect lists.
export default function ProspectListPicker({ wizard }) {
    const {
        isListDropdownOpen, listSearchQuery, prospectLists, selectedLists, setExcludedProspectIds,
        setIsListDropdownOpen, setListSearchQuery, setProspectPage, setSelectedLists
    } = wizard;
    return (
        <div className="relative">
            {/* Click outside to close - rendered BEFORE dropdown so it's behind */}
            {isListDropdownOpen && (
                <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsListDropdownOpen(false)}
                />
            )}

            {/* Search Input / Selected Display */}
            <div
                onClick={() => setIsListDropdownOpen(!isListDropdownOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-all relative z-20"
            >
                <Search className="w-4 h-4 text-slate-400" />
                <span className={`flex-1 text-sm ${selectedLists.length > 0 ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                    {selectedLists.length > 0
                        ? prospectLists?.find(l => l.list_id === selectedLists[0])?.list_name || 'Selected list'
                        : 'Search and select a list...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isListDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isListDropdownOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                    >
                        {/* Search Input in Dropdown */}
                        <div className="p-3 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search lists..."
                                    value={listSearchQuery}
                                    onChange={(e) => setListSearchQuery(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* List Items */}
                        <div className="max-h-64 overflow-y-auto">
                            {prospectLists
                                ?.filter(list => list.list_name.toLowerCase().includes(listSearchQuery.toLowerCase()))
                                ?.map(list => (
                                    <div
                                        key={list.list_id}
                                        onClick={() => {
                                            setSelectedLists([list.list_id]);
                                            setExcludedProspectIds([]);
                                            setProspectPage(1);
                                            setIsListDropdownOpen(false);
                                            setListSearchQuery('');
                                        }}
                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${selectedLists.includes(list.list_id)
                                            ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                            : 'hover:bg-slate-50'
                                            }`}
                                    >
                                        {/* Radio indicator */}
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedLists.includes(list.list_id)
                                            ? 'border-blue-500 bg-blue-500'
                                            : 'border-slate-300'
                                            }`}>
                                            {selectedLists.includes(list.list_id) && (
                                                <CheckCircle className="w-4 h-4 text-white" />
                                            )}
                                        </div>

                                        {/* List info */}
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-900">{list.list_name}</p>
                                            <p className="text-xs text-slate-500">
                                                {list.prospect_count?.toLocaleString() || 0} prospects
                                                {list.uploaded_at && ` · ${new Date(list.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                            {prospectLists?.filter(list => list.list_name.toLowerCase().includes(listSearchQuery.toLowerCase())).length === 0 && (
                                <div className="px-4 py-8 text-center text-slate-400 text-sm">
                                    No lists match your search
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
