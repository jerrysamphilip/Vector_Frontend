import { User } from 'lucide-react';

// Step 4: every canonical persona (plus OTHER when detected); undetected ones generate a template on click.
export default function PersonaPicker({ wizard }) {
    const {
        allPersonas, generatePersonaMutation, processingResult, selectedPersona, setPreviewProspect,
        setSelectedPersona
    } = wizard;
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(() => {
                const detected = processingResult?.templates_generated || [];
                // Always show all 5 canonical personas, plus OTHER if it was actually detected
                // (OTHER is a classification fallback, not a deliberate target).
                const otherDetected = detected.find(t => t.persona_type === 'OTHER');
                const pickerList = [
                    ...(allPersonas || []),
                    ...(otherDetected ? [{ persona_type: 'OTHER', persona_label: otherDetected.persona_label || 'Other' }] : []),
                ];
                return pickerList.map((p) => {
                    const item = detected.find(t => t.persona_type === p.persona_type);
                    const isGenerating = generatePersonaMutation.isPending
                        && generatePersonaMutation.variables === p.persona_type;
                    return (
                        <button
                            key={p.persona_type}
                            onClick={() => {
                                if (item) {
                                    setSelectedPersona(item.persona_type);
                                    const samples = processingResult.sample_prospects?.[item.persona_type] || [];
                                    setPreviewProspect(samples[0] || null);
                                } else {
                                    generatePersonaMutation.mutate(p.persona_type);
                                }
                            }}
                            disabled={!item && generatePersonaMutation.isPending}
                            className="p-4 rounded-xl border-2 transition-all text-left disabled:opacity-60"
                            style={selectedPersona === p.persona_type
                                ? { borderColor: '#2d6bbf', background: 'rgba(45,107,191,0.04)' }
                                : { borderColor: '#e5e7eb', background: '#fff' }}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={selectedPersona === p.persona_type
                                    ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', color: '#fff' }
                                    : { background: '#f1f5f9', color: '#6b7280' }}>
                                    <User className="w-4 h-4" />
                                </div>
                                {item ? (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-green-100 text-green-700 rounded uppercase">AI Mode</span>
                                ) : (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase">Not Detected</span>
                                )}
                            </div>
                            <p className="font-bold text-gray-900 truncate">{p.persona_label}</p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter mt-1">
                                {isGenerating ? 'Generating…' : item ? `${item.prospect_count} Leads` : '0 Leads · Click to generate'}
                            </p>
                        </button>
                    );
                });
            })()}
        </div>
    );
}
