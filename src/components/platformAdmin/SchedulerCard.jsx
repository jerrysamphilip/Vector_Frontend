import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, PauseCircle, PlayCircle, Send } from 'lucide-react';
import { platformAdminApi } from '../../api/platformAdmin';
import { Skeleton, SectionCard, errDetail } from './adminShared';
import { useConfirm } from '../ui/ConfirmDialog';

/** Platform-wide email scheduler pause switch (/scheduler/status|stop|start). */
export default function SchedulerCard() {
    const queryClient = useQueryClient();
    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin-scheduler'],
        queryFn: platformAdminApi.getSchedulerStatus,
        staleTime: 15_000,
    });
    const running = data?.running;
    const toggle = useMutation({
        mutationFn: (pause) => (pause ? platformAdminApi.pauseScheduler() : platformAdminApi.resumeScheduler()),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-scheduler'] }),
    });
    const confirm = useConfirm();
    const onToggle = async () => {
        const pause = Boolean(running);
        const ok = await confirm(pause
            ? { title: 'Pause the email scheduler?', message: 'No scheduled campaign email is sent for any tenant until it is resumed.', confirmLabel: 'Pause', danger: true }
            : { title: 'Resume the email scheduler?', message: 'Scheduled campaign emails start sending again for every tenant.', confirmLabel: 'Resume' });
        if (ok) toggle.mutate(pause);
    };

    return (
        <SectionCard
            title="Email scheduler"
            subtitle="Sends scheduled campaign emails for every tenant"
            icon={Send}
            delay="360ms"
            action={!isLoading && !isError && (
                <button
                    type="button"
                    onClick={onToggle}
                    disabled={toggle.isPending}
                    data-testid="scheduler-toggle"
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${running
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                >
                    {running ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                    {running ? 'Pause scheduler' : 'Resume scheduler'}
                </button>
            )}
        >
            <div className="flex flex-wrap items-center gap-3 px-6 py-4 text-sm" data-testid="scheduler-status">
                {isLoading ? <Skeleton className="h-5 w-40" /> : isError ? (
                    <span className="text-rose-600">Could not read the scheduler status.</span>
                ) : (
                    <>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${running
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                            {running ? <CheckCircle2 className="h-3 w-3" /> : <PauseCircle className="h-3 w-3" />}
                            {running ? 'Running' : 'Paused'}
                        </span>
                        <span className="text-slate-500">
                            {running
                                ? 'Scheduled emails are being sent.'
                                : `Sending is paused for all tenants${data?.paused_by ? ` (paused by ${data.paused_by})` : ''}.`}
                        </span>
                    </>
                )}
                {toggle.isError && <span className="text-rose-600">{errDetail(toggle.error, 'Could not change the scheduler state.')}</span>}
            </div>
        </SectionCard>
    );
}
