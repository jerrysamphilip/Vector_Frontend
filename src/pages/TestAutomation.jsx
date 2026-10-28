import { useState } from 'react';
import { campaignApi } from '../api/campaigns';
import { useApiQuery } from '../lib/useApiQuery';

export function automationStatus({ data, error, isFetching }) {
    if (error) return `Error: ${error.message}`;
    if (isFetching && !data) return 'Fetching campaigns...';
    if (!data) return 'Loading...';
    return `Loaded ${(data.items || data || []).length} campaign(s)`;
}

export default function TestAutomation() {
    const [selectedCampaign, setSelectedCampaign] = useState('');
    const query = useApiQuery(['campaigns', 'all', 'test-automation'], () => campaignApi.listAll(), { retry: false });
    const campaigns = query.data?.items || query.data || [];
    const status = automationStatus(query);

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Test Automation Dropdown</h1>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm"><strong>Status:</strong> {status}</p>
                <p className="text-sm"><strong>Campaigns count:</strong> {campaigns.length}</p>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Select Campaign</label>
                <select
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                >
                    <option value="">Select a campaign...</option>
                    {campaigns.map((c, index) => (
                        <option key={c.campaign_id || index} value={c.campaign_id}>
                            {c.campaign_name || 'Unnamed Campaign'} (ID: {c.campaign_id?.slice(-8)})
                        </option>
                    ))}
                </select>
            </div>

            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                <p className="text-sm font-mono break-all">
                    <strong>Selected:</strong> {selectedCampaign || 'None'}
                </p>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm"><strong>Campaigns data:</strong></p>
                <pre className="text-xs mt-2 overflow-auto">
                    {JSON.stringify(campaigns, null, 2)}
                </pre>
            </div>
        </div>
    );
}
