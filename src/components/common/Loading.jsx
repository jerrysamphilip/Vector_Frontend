import React from 'react';
import { motion } from 'framer-motion';

/**
 * Loading component displays an animated loading GIF.
 * Use this component for loading states across the app.
 * 
 * @param {string} text - Optional loading text (default: "Loading...")
 * @param {string} size - Size class: 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} fullScreen - Whether to show fullscreen overlay
 */
export default function Loading({ text = "Loading...", size = "md", fullScreen = false }) {
    const sizeClasses = {
        sm: "w-8 h-8",
        md: "w-14 h-14",
        lg: "w-20 h-20"
    };

    const content = (
        <div className="flex flex-col items-center justify-center gap-4">
            {/* Circular container with breathing animation - No background */}
            <motion.div
                animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.9, 1, 0.9]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center`}
            >
                <img
                    src={`${import.meta.env.BASE_URL}loading.gif`}
                    alt="Loading"
                    className="w-full h-full object-cover scale-[1.7]"
                />
            </motion.div>
            {text && (
                <motion.p
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="text-sm font-medium text-slate-500 tracking-wide"
                >
                    {text}
                </motion.p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 flex items-center justify-center z-50">
                {content}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center w-full h-full min-h-[60vh]">
            {content}
        </div>
    );
}
