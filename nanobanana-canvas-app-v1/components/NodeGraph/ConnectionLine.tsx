import React from 'react';

interface ConnectionLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isActive?: boolean;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({ x1, y1, x2, y2, isActive }) => {
  // Bezier curve logic
  const dist = Math.abs(x2 - x1);
  const controlOffset = Math.min(dist * 0.5, 150);
  
  const path = `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;

  return (
    <g className="pointer-events-none">
      {/* Shadow/Outline for visibility against dark bg */}
      <path
        d={path}
        stroke="#020617" 
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        className="opacity-40"
      />
      
      {/* Main Wire */}
      <path
        d={path}
        stroke={isActive ? "#fbbf24" : "url(#gradient-line)"} 
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        className="transition-all duration-300"
        style={{ strokeDasharray: isActive ? '5,5' : 'none', animation: isActive ? 'dash 1s linear infinite' : 'none' }}
      />
      
      {/* Definitions for Gradient */}
      <defs>
        <linearGradient id="gradient-line" gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
          <stop offset="0%" stopColor="#64748b" /> {/* Slate-500 */}
          <stop offset="100%" stopColor="#94a3b8" /> {/* Slate-400 */}
        </linearGradient>
        <style>
          {`
            @keyframes dash {
              to {
                stroke-dashoffset: -10;
              }
            }
          `}
        </style>
      </defs>

      {/* Start Dot (Source) */}
      <circle 
        cx={x1} 
        cy={y1} 
        r="3" 
        fill={isActive ? "#fbbf24" : "#64748b"} 
        stroke="#0f172a" 
        strokeWidth="1"
      />

      {/* End Dot (Target) */}
      <circle 
        cx={x2} 
        cy={y2} 
        r="3" 
        fill={isActive ? "#fbbf24" : "#94a3b8"} 
        stroke="#0f172a" 
        strokeWidth="1"
      />
    </g>
  );
};