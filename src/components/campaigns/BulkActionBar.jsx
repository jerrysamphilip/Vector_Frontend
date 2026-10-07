import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Trash2, X, CheckSquare } from 'lucide-react';
import { Button } from '../ui/Button';

export default function BulkActionBar({ selectedCount = 0, onClear, onAction }) {
    return (
        <AnimatePresence>
            {selectedCount > 0 && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md text-white rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-6 border border-slate-700 max-w-2xl w-full mx-4"
                >
                    <div className="flex items-center gap-3 border-r border-slate-700 pr-6">
                        <div className="bg-indigo-500 rounded-lg px-2.5 py-1 text-sm font-bold flex items-center gap-2">
                            <CheckSquare className="w-4 h-4" />
                            {selectedCount}
                        </div>
                        <span className="text-sm font-medium text-slate-300">Selected</span>
                    </div>

                    <div className="flex items-center gap-2 flex-1 justify-center">
                        <Button
                            variant="ghost"
                            className="text-slate-300 hover:text-white hover:bg-slate-800"
                            onClick={() => onAction('pause')}
                        >
                            <Pause className="w-4 h-4 mr-2" /> Pause
                        </Button>
                        <Button
                            variant="ghost"
                            className="text-slate-300 hover:text-white hover:bg-slate-800"
                            onClick={() => onAction('resume')}
                        >
                            <Play className="w-4 h-4 mr-2" /> Resume
                        </Button>
                        <div className="w-px h-6 bg-slate-700 mx-2" />
                        <Button
                            variant="ghost"
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-900/30"
                            onClick={() => onAction('delete')}
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </Button>
                    </div>

                    <button
                        onClick={onClear}
                        className="p-1 text-slate-500 hover:text-slate-300 transition-colors ml-auto"
                        title="Clear Selection"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
