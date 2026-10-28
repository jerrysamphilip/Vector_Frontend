import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import RenameCampaignModal from './RenameCampaignModal';
import DuplicateCampaignModal from './DuplicateCampaignModal';

/**
 * Rename / Duplicate dialogs shared by the campaigns list and the campaign page.
 * openDialog('rename' | 'duplicate', campaign); render `dialogs` once.
 */
export function useCampaignDialogs({ onOpenCopy } = {}) {
    const queryClient = useQueryClient();
    const [dialog, setDialog] = useState(null); // { kind, campaign }
    const close = () => setDialog(null);
    const refresh = (campaignId) => {
        queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        if (campaignId) queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    };

    const dialogs = dialog && (dialog.kind === 'rename'
        ? <RenameCampaignModal campaign={dialog.campaign} onClose={close} onRenamed={() => refresh(dialog.campaign.campaign_id)} />
        : <DuplicateCampaignModal campaign={dialog.campaign} onClose={close} onDuplicated={() => refresh()}
            onOpenCopy={onOpenCopy && ((copy) => { close(); onOpenCopy(copy); })} />);

    return { openDialog: (kind, campaign) => setDialog({ kind, campaign }), dialogs };
}
