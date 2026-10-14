import { Button } from '../../ui/Button';
import UploadRecordsTable from './UploadRecordsTable';
import { AlertCircle, CheckCircle, FileSpreadsheet, Loader2 } from 'lucide-react';

// Step 3 "Upload New List": name + file, validate & preview, re-validate, confirm & create the list.
export default function ProspectUploadPanel({ wizard }) {
    const {
        editableUploadRecords, handleConfirmUpload, handleUploadDryRun, handleUploadRevalidate, setUploadConfirmed,
        setUploadFile, setUploadResult, setUploadTitle, uploadConfirmed, uploadFile, uploadLoading, uploadResult,
        uploadTitle
    } = wizard;
    return (
        <div className="space-y-3">
            {/* Compact Row: List Name + File Upload */}
            <div className="flex gap-3">
                {/* List Name */}
                <div className="flex-1">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">List Name</label>
                    <input
                        type="text"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="e.g. January 2026 Leads"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                </div>

                {/* File Upload */}
                <div className="flex-1">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Upload File</label>
                    <label className="cursor-pointer block">
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={(e) => {
                                setUploadFile(e.target.files[0]);
                                setUploadResult(null);
                                setUploadConfirmed(false);
                            }}
                            className="hidden"
                        />
                        <div className={`flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded-lg transition text-sm ${uploadFile
                            ? 'border-blue-400 bg-blue-50 text-blue-700'
                            : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-slate-600'
                            }`}>
                            <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">
                                {uploadFile ? uploadFile.name : 'Excel File'}
                            </span>
                        </div>
                    </label>
                </div>
            </div>

            {/* Validate Button - Compact */}
            {uploadFile && !uploadResult && (
                <Button
                    onClick={handleUploadDryRun}
                    disabled={uploadLoading || !uploadTitle.trim()}
                    className="w-full h-9 text-sm"
                >
                    {uploadLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Validating...
                        </>
                    ) : (
                        <>Validate & Preview</>
                    )}
                </Button>
            )}

            {/* Validation Results - Compact */}
            {uploadResult && (
                <div className="space-y-3">
                    {/* Inline Stats Bar */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-sm">
                        <div className="flex items-center gap-4">
                            <span className="text-slate-600">
                                <strong className="text-slate-900">{uploadResult.total_rows}</strong> total
                            </span>
                            <span className="text-emerald-600">
                                <strong>{uploadResult.accepted}</strong> accepted
                            </span>
                            {uploadResult.rejected > 0 && (
                                <span className="text-red-500">
                                    <strong>{uploadResult.rejected}</strong> rejected
                                </span>
                            )}
                        </div>
                        {uploadResult.rejected > 0 && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Invalid emails filtered
                            </span>
                        )}
                    </div>

                    {/* Compact Inline Table (matching ProspectValidate style) */}
                    {editableUploadRecords.length > 0 && (
                        <UploadRecordsTable wizard={wizard} />
                    )}

                    {!uploadConfirmed ? (
                        <div className="flex gap-2">
                            <Button
                                onClick={handleUploadRevalidate}
                                disabled={uploadLoading || editableUploadRecords.length === 0}
                                variant="outline"
                                className="flex-1"
                            >
                                {uploadLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Validating...
                                    </>
                                ) : (
                                    <>Re-validate Records</>
                                )}
                            </Button>

                            <button
                                onClick={handleConfirmUpload}
                                disabled={uploadLoading || editableUploadRecords.filter(r => r.status === 'ACCEPTED').length === 0 || !uploadTitle.trim()}
                                className="flex-1 flex items-center justify-center gap-2 text-white font-semibold h-10 px-4 rounded-lg transition-all hover:scale-[1.02] disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                            >
                                {uploadLoading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" />Creating List...</>
                                ) : (
                                    <><CheckCircle className="w-4 h-4" />Confirm & Create List ({editableUploadRecords.filter(r => r.status === 'ACCEPTED').length} prospects)</>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                            <p className="text-sm text-emerald-800 font-medium">
                                List "{uploadTitle}" created with {uploadResult.accepted} prospects!
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
