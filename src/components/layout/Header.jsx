import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useId, useState } from 'react';
import { getDisplayName, hasPermission } from '../../lib/authStorage';

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

// 6am = 100% full, drains to ~8% by midnight, holds low until 6am refill
function getCoffeeLevel(h) {
    // Hours elapsed since 6am (0–18 = 6am→midnight, 18–24 = midnight→6am)
    const shifted = (h - 6 + 24) % 24;
    // Drain over exactly 18 hours (6am to midnight), then hold near-empty
    const drain = Math.min(shifted, 18);
    return Math.round(100 - (drain / 18) * 92);
}

// ── Clean outline cup — like the reference image ───────────────────────────
function CoffeeCup() {
    const [hovered, setHovered] = useState(false);
    const clipId = useId().replace(/:/g, '');
    const gradId = useId().replace(/:/g, '');

    const h          = new Date().getHours();
    const targetLevel = getCoffeeLevel(h);
    const [displayLevel, setDisplayLevel] = useState(0);

    // Animate fill from 0 → targetLevel on mount
    useEffect(() => {
        const duration = 1600; // ms
        const start    = performance.now();
        let raf;
        const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayLevel(Math.round(eased * targetLevel));
            if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [targetLevel]);

    const level = displayLevel;

    const coffeeColor = h < 9 ? '#bf7840' : h < 14 ? '#8B5230' : h < 20 ? '#6b3a1c' : '#3d1e0a';
    const steamOp     = level > 60 ? 1 : level > 35 ? 0.55 : 0.15;

    // Cup interior clip: matches inner cup walls
    // Inner top y=38, bottom y=80, height=42
    const CY = 38, CH = 42;
    const fillH   = Math.max(3, (level / 100) * CH);
    const fillTop = CY + CH - fillH;

    // Interpolate inner wall x at fillTop  (left: 18→22, right: 72→68)
    const t  = (fillTop - CY) / CH;
    const lx = 18 + t * 4;
    const rx = 72 - t * 4;
    const wW = rx - lx;

    const amp  = hovered ? 3 : 1.2;
    const wave = `M${lx},${amp} `
        + `C${lx+wW*.25},0 ${lx+wW*.5},${amp*2} ${lx+wW*.75},${amp} `
        + `C${lx+wW},0 ${lx+wW*1.25},${amp*2} ${lx+wW*1.5},${amp} `
        + `C${lx+wW*1.75},0 ${lx+wW*2},${amp*2} ${lx+wW*2.25},${amp} `
        + `L${lx+wW*2.25},${fillH+2} L${lx},${fillH+2} Z`;

    const SK = { stroke:'#1a1a1a', strokeWidth:'2.8', strokeLinecap:'round', strokeLinejoin:'round', fill:'none' };

    return (
        <span
            style={{ display:'inline-block', verticalAlign:'middle', cursor:'default', marginLeft:8, marginBottom:2 }}
            title={`Coffee: ${level}%`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <svg width="46" height="54" viewBox="0 0 96 106" style={{ overflow:'visible' }}>
                <defs>
                    {/* Clip to cup interior */}
                    <clipPath id={clipId}>
                        <path d="M18,38 C16,46 15,64 18,72 C22,80 32,84 48,84 C64,84 74,80 78,72 C81,64 80,46 78,38 Z" />
                    </clipPath>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={coffeeColor} stopOpacity="0.92" />
                        <stop offset="100%" stopColor={h < 9 ? '#7a4020' : '#2a1206'} stopOpacity="1" />
                    </linearGradient>
                </defs>

                {/* ── 3 Steam wisps ── */}
                <g opacity={steamOp}>
                    <path d="M28,35 C28,29 32,29 32,23 C32,17 28,17 28,11"
                        {...SK} strokeWidth="2.5"
                        className={hovered ? 'steam-fast' : 'steam-slow'} />
                    <path d="M48,33 C48,27 52,27 52,21 C52,15 48,15 48,9"
                        {...SK} strokeWidth="2.5"
                        className={hovered ? 'steam-fast' : 'steam-slow'}
                        style={{ animationDelay:'0.55s' }} />
                    <path d="M68,35 C68,29 72,29 72,23 C72,17 68,17 68,11"
                        {...SK} strokeWidth="2.5"
                        className={hovered ? 'steam-fast' : 'steam-slow'}
                        style={{ animationDelay:'1.1s' }} />
                </g>

                {/* ── Coffee fill (behind cup outline) ── */}
                <g clipPath={`url(#${clipId})`}>
                    <g transform={`translate(0,${fillTop})`}>
                        <g className={hovered ? 'water-wave-fast' : 'water-wave-slow'}>
                            <path d={wave} fill={`url(#${gradId})`} />
                        </g>
                    </g>
                </g>

                {/* ── Cup body outline ── */}
                <path
                    d="M18,38 C16,46 15,64 18,72 C22,80 32,84 48,84 C64,84 74,80 78,72 C81,64 80,46 78,38 Z"
                    fill="transparent" {...SK}
                />

                {/* ── Handle — D-shape with inner line ── */}
                <path d="M78,48 C92,48 94,54 94,62 C94,70 92,76 78,76"
                    {...SK} />
                {/* Handle inner detail */}
                <path d="M78,53 C88,53 89,57 89,62 C89,67 88,71 78,71"
                    fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />

                {/* ── Saucer ── */}
                <path d="M8,88 C8,84 16,82 48,82 C80,82 88,84 88,88 C88,92 80,94 48,94 C16,94 8,92 8,88 Z"
                    fill="transparent" {...SK} />
                {/* Saucer top edge highlight */}
                <path d="M10,87 C10,84 18,83 48,83 C78,83 86,84 86,87"
                    fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        </span>
    );
}

export default function Header({ actionSlot = null }) {
    const navigate  = useNavigate();
    const [userName, setUserName] = useState('');

    useEffect(() => { setUserName(getDisplayName()); }, []);

    return (
        <header className="w-full flex items-center justify-between mb-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight flex items-center">
                    {getGreeting()}, {userName}
                    <CoffeeCup />
                </h2>
                <p className="text-sm text-gray-400 mt-1">Here's what's happening with your campaigns today.</p>
            </div>

            <div className="flex items-center gap-3">
                {actionSlot}
                {hasPermission('manage_campaigns') && (
                    <button
                        onClick={() => navigate('/app/campaigns/new')}
                        className="flex items-center gap-2 text-white h-9 px-4 rounded-lg text-sm font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                    >
                        <Plus className="w-5 h-5" />
                        <span>Create New Campaign</span>
                    </button>
                )}
            </div>
        </header>
    );
}
