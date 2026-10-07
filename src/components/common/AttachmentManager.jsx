import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Paperclip, X, FileText, Loader2 } from 'lucide-react';
import { templateApi } from '../../api/campaigns';

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // keep in sync with backend MAX_ATTACHMENT_SIZE_MB

function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Gmail-style "attach files" control for an email template — shows uploaded
 * files as removable chips and lets the user add more via a paperclip button.
 */
export default function AttachmentManager({ templateId, disabled = false }) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const [error, setError] = useState('');

    const queryKey = ['template-attachments', templateId];

    const { data: attachments = [] } = useQuery({
        queryKey,
        queryFn: () => templateApi.listAttachments(templateId),
        enabled: !!templateId,
    });

    const uploadMutation = useMutation({
        mutationFn: (file) => templateApi.uploadAttachment(templateId, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            setError('');
        },
        onError: (err) => {
            setError(err.response?.data?.detail || 'Failed to upload attachment');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (attachmentId) => templateApi.deleteAttachment(templateId, attachmentId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });

    const handleFiles = (fileList) => {
        setError('');
        Array.from(fileList || []).forEach((file) => {
            if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
                setError(`"${file.name}" exceeds the 10MB attachment limit`);
                return;
            }
            uploadMutation.mutate(file);
        });
    };

    if (!templateId) return null;

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                {attachments.map((att) => (
                    <div
                        key={att.attachment_id}
                        className="flex items-center gap-1.5 pl-2 pr-1 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-700 max-w-xs"
                    >
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium">{att.filename}</span>
                        <span className="text-slate-400 shrink-0">{formatFileSize(att.size_bytes)}</span>
                        <button
                            type="button"
                            onClick={() => deleteMutation.mutate(att.attachment_id)}
                            disabled={disabled || deleteMutation.isPending}
                            className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-40"
                            title="Remove attachment"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || uploadMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 border border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                >
                    {uploadMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Paperclip className="w-3.5 h-3.5" />
                    )}
                    Attach files
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => {
                        handleFiles(e.target.files);
                        e.target.value = '';
                    }}
                />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}
