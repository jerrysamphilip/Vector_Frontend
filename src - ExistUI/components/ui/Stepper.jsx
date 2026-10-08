import { Check } from 'lucide-react';

export function Stepper({ steps, currentStep, onStepClick }) {
    return (
        <div className="w-full">
            <div className="flex items-center w-full">
                {steps.map((step, index) => {
                    const isCompleted = currentStep > step.id;
                    const isActive = currentStep === step.id;
                    const isClickable = onStepClick && (isCompleted || isActive);

                    return (
                        <div key={step.id} className="flex-1 flex flex-col items-center relative">
                            {/* Connector Line */}
                            {index !== 0 && (
                                <div
                                    className={`absolute top-4 right-[50%] w-full h-[2px] -z-10
                                    ${isCompleted || isActive ? 'bg-blue-600' : 'bg-slate-200'}`}
                                />
                            )}

                            {/* Step Node */}
                            <div
                                onClick={() => isClickable && onStepClick(step.id)}
                                className={`
                                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 z-10 bg-white
                                    ${isClickable ? 'cursor-pointer hover:scale-110' : ''}
                                    ${isActive
                                        ? 'border-blue-600 text-blue-600 ring-4 ring-blue-50'
                                        : isCompleted
                                            ? 'border-blue-600 bg-blue-600 text-white'
                                            : 'border-slate-200 text-slate-400'
                                    }
                                `}
                            >
                                {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                            </div>

                            {/* Label */}
                            <span
                                className={`
                                    mt-2 text-xs font-bold tracking-wide uppercase transition-colors duration-300 text-center
                                    ${isActive ? 'text-blue-700' : isCompleted ? 'text-blue-600' : 'text-slate-400'}
                                `}
                            >
                                {step.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Stepper;
