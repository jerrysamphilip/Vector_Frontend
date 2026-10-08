// Premium AI Generation Progress Panel
// Based on premium SaaS patterns - Vercel/Linear style
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, CheckCircle } from "lucide-react"

export function AIGenerationLoader({
    isLoading,
    currentStep,
    totalSteps,
    statusMessage,
}) {
    const progress = Math.min((currentStep / totalSteps) * 100, 100)

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="relative w-full rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-lg p-4 md:p-5"
                >
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <motion.div
                            animate={{ rotate: [0, 8, -8, 0] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20"
                        >
                            <Sparkles className="h-5 w-5 text-white" />
                        </motion.div>

                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">
                                AI is generating templates
                            </p>
                            <p className="text-xs text-slate-500">
                                Step {currentStep} of {totalSteps}
                            </p>
                        </div>

                        {currentStep === totalSteps && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                    </div>

                    {/* Status Message with Animation */}
                    <motion.div
                        key={statusMessage}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="mt-4 flex items-center gap-2"
                    >
                        <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="w-1.5 h-1.5 rounded-full bg-blue-500"
                        />
                        <p className="text-sm text-slate-600">
                            {statusMessage}
                        </p>
                    </motion.div>

                    {/* Progress Bar */}
                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ ease: "easeOut", duration: 0.6 }}
                        />
                    </div>

                    {/* Shimmer effect on the bar */}
                    <motion.div
                        className="absolute bottom-[22px] left-4 right-4 h-1.5 rounded-full overflow-hidden pointer-events-none"
                        style={{ opacity: 0.3 }}
                    >
                        <motion.div
                            className="h-full w-1/3 bg-gradient-to-r from-transparent via-white to-transparent"
                            animate={{ x: ['-100%', '400%'] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default AIGenerationLoader
