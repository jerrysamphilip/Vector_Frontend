import { User } from 'lucide-react';

// Step 1 "Sender Details": sender name, title and CTA / booking link.
export default function SenderDetailsSection({ wizard }) {
    const {
        formData, setFormData
    } = wizard;
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #73C8D222, #4db0bb22)' }}>
                    <User className="w-3.5 h-3.5" style={{ color: '#73C8D2' }} />
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sender Details</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sender Name</label>
                    <input
                        name="sender_name"
                        value={formData.sender_name}
                        onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                        placeholder="e.g. John Smith"
                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sender Title</label>
                    <input
                        name="sender_title"
                        value={formData.sender_title}
                        onChange={(e) => setFormData({ ...formData, sender_title: e.target.value })}
                        placeholder="e.g. Account Executive"
                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">CTA / Booking Link</label>
                    <input
                        name="cta_link"
                        value={formData.cta_link}
                        onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                        placeholder="https://calendly.com/..."
                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                    />
                </div>
            </div>
        </div>
    );
}
