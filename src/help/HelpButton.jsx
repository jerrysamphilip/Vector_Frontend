import { HelpCircle } from 'lucide-react';
import { useHelp } from './HelpPanel';

/** Always-visible help in the top bar: opens help for the current screen (also ? or F1). */
export default function HelpButton() {
    const { open, openHelp, closeHelp } = useHelp();
    return (
        <button onClick={() => (open ? closeHelp() : openHelp())} aria-label="Help for this screen" title="Help for this screen (?)"
            className={`h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-sm font-medium ${open ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
            <HelpCircle className="w-4 h-4" /> Help
        </button>
    );
}
