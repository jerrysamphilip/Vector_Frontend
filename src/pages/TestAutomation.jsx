import React, { useState, useEffect } from 'react';
import { campaignApi } from '../api/campaigns';

export default function TestAutomation() {
    const [campaigns, setCampaigns] = useState([]);
    const [status, setStatus] = useState('Loading...');
    const [selectedCampaign, setSelectedCampaign] = useState('');

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            setStatus('Fetching campaigns...');
            const data = await campaignApi.list();
            console.log('[TestAutomation] Raw API response:', data);
            console.log('[TestAutomation] data.items:', data.items);
            setCampaigns(data.items || data || []);
            setStatus(`Loaded ${(data.items || data || []).length} campaign(s)`);
        } catch (error) {
            console.error('[TestAutomation] Error:', error);
            setStatus(`Error: ${error.message}`);
        }
    };

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
                            {c.campaign_name || 'Unnamed Campaign'} (ID: {c.campaign_id?.slice(0, 8)})
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
