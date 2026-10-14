import { AnimatePresence } from 'framer-motion';
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

function CreateCampaignContent() {
    const wizard = useCreateCampaignWizard();
    const { currentStep, enrollReport, setEnrollReport, navigate } = wizard;

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
