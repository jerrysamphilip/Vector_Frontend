import { AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { errorMessage, errorReference } from '../lib/apiErrors';
import PageTransition from '../components/layout/PageTransition';
import ErrorBoundary from '../components/common/ErrorBoundary';
import EnrollmentResultModal from '../components/campaigns/EnrollmentResultModal';
import { useCreateCampaignWizard } from '../components/campaigns/wizard/useCreateCampaignWizard';
import WizardHeader from '../components/campaigns/wizard/WizardHeader';
import StepDetails from '../components/campaigns/wizard/StepDetails';
import StepSequence from '../components/campaigns/wizard/StepSequence';
import StepProspects from '../components/campaigns/wizard/StepProspects';
import StepTemplates from '../components/campaigns/wizard/StepTemplates';
import StepLaunch from '../components/campaigns/wizard/StepLaunch';

// Create / edit campaign wizard (/app/campaigns/new, ?edit=<id> to resume one, ?fresh=true to discard the draft):
// 1 Details -> 2 Sequence -> 3 Prospects -> 4 Templates (AI, per persona) -> 5 Launch.
// State and server actions live in useCreateCampaignWizard; each step is a component under
// components/campaigns/wizard/ that reads what it needs from the `wizard` object.

export default function CreateCampaign() {
    return (
        <ErrorBoundary>
            <CreateCampaignContent />
        </ErrorBoundary>
    );
}

function DraftLoadError({ error, editing }) {
    const reference = errorReference(error);
    return (
        <div role="alert" className="max-w-7xl mx-auto px-8 pt-4">
            <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                    <p className="font-semibold">{editing ? "Couldn't load this campaign for editing." : "Couldn't load your saved draft."} You are starting from a blank form.</p>
                    <p>{errorMessage(error)}{reference && <span className="text-red-500"> Reference: <span className="font-mono select-all">{reference}</span></span>}</p>
                </div>
            </div>
        </div>
    );
}

function CreateCampaignContent() {
    const wizard = useCreateCampaignWizard();
    const { currentStep, enrollReport, setEnrollReport, navigate, editCampaignId } = wizard;
    const draftError = wizard.snapError;

    return (
        <PageTransition>
            {enrollReport && (
                <EnrollmentResultModal
                    title={enrollReport.launched ? 'Campaign launched' : 'Campaign not launched'}
                    enrolled={enrollReport.enrolled}
                    rejected={enrollReport.rejected}
                    note={enrollReport.launched
                        ? 'These contacts were not added to the campaign:'
                        : 'None of the selected contacts could be enrolled. Fix or remove them, then launch again.'}
                    closeLabel={enrollReport.launched ? 'Go to campaigns' : 'Close'}
                    onClose={() => {
                        const launched = enrollReport.launched;
                        setEnrollReport(null);
                        if (launched) navigate('/app/campaigns');
                    }}
                />
            )}
            <div className="min-h-screen pb-12" style={{ background: 'var(--canvas-bg, #F6F4EE)' }}>
                <WizardHeader wizard={wizard} />
                {draftError && <DraftLoadError error={draftError} editing={Boolean(editCampaignId)} />}

                <main className="max-w-7xl mx-auto px-8 pt-6 pb-12 font-inter">
                    <AnimatePresence mode="wait">
                        {currentStep === 1 && <StepDetails key="step1" wizard={wizard} />}
                        {currentStep === 2 && <StepSequence key="step2" wizard={wizard} />}
                        {currentStep === 3 && <StepProspects key="step3" wizard={wizard} />}
                        {currentStep === 4 && <StepTemplates key="step4" wizard={wizard} />}
                        {currentStep === 5 && <StepLaunch key="step5" wizard={wizard} />}
                    </AnimatePresence>
                </main>
            </div>
        </PageTransition>
    );
}
