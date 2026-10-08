
import React from 'react';
import { motion } from 'framer-motion';

const ReputationGauge = ({ score, size = 128 }) => {
    // Calculate color based on score
    const getColor = (s) => {
        if (s >= 80) return '#10b981'; // Emerald 500
        if (s >= 60) return '#f59e0b'; // Amber 500
        return '#ef4444'; // Red 500
    };

    const color = getColor(score);
    const normalizedScore = Math.min(Math.max(score, 0), 100);
    // Use fixed coordinate system for SVG internals, scale via width/height
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (normalizedScore / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                {/* Background Circle */}
                <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-slate-100"
                />
                {/* Progress Circle */}
                <motion.circle
                    cx="64"
                    cy="64"
                    r={radius}
                    stroke={color}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                />
            </svg>
            {/* Score Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    className="font-bold text-slate-800"
                    style={{ fontSize: size * 0.25 }} // Scale font size relative to container
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    {normalizedScore}
                </motion.span>
                {size >= 80 && ( // Only show label if large enough
                    <span className="font-medium text-slate-400 uppercase tracking-wider" style={{ fontSize: size * 0.1 }}>
                        Score
                    </span>
                )}
            </div>
        </div>
    );
};

export default ReputationGauge;
