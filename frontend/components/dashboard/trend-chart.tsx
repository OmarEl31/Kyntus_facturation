'use client';

import React from 'react';

const data = [
  { month: 'Mai', facturable: 420, nonFacturable: 280, attente: 250 },
  { month: 'Juin', facturable: 480, nonFacturable: 310, attente: 270 },
  { month: 'Juil', facturable: 510, nonFacturable: 330, attente: 290 },
  { month: 'Août', facturable: 490, nonFacturable: 340, attente: 280 },
  { month: 'Sept', facturable: 530, nonFacturable: 350, attente: 295 },
  { month: 'Oct', facturable: 556, nonFacturable: 370, attente: 308 },
];

export default function TrendChart() {
  // Trouver la valeur max pour l'échelle
  const maxValue = Math.max(
    ...data.map(d => d.facturable + d.nonFacturable + d.attente)
  );
  const chartHeight = 280;
  const chartWidth = 100; // percentage

  // Calculer les points pour chaque ligne
  const getPoints = (values: number[]) => {
    return values.map((value, index) => {
      const x = (index / (values.length - 1)) * chartWidth;
      const y = chartHeight - (value / maxValue) * chartHeight;
      return `${x},${y}`;
    }).join(' ');
  };

  const facturablePoints = getPoints(data.map(d => d.facturable));
  const nonFacturablePoints = getPoints(data.map(d => d.nonFacturable));
  const attentePoints = getPoints(data.map(d => d.attente));

  return (
    <div>
      {/* Chart */}
      <div className="relative" style={{ height: `${chartHeight}px` }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y = (i / 4) * chartHeight;
            return (
              <line
                key={i}
                x1="0"
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
            );
          })}

          {/* Area - Facturable */}
          <polygon
            points={`0,${chartHeight} ${facturablePoints} ${chartWidth},${chartHeight}`}
            fill="url(#gradientFacturable)"
            opacity="0.3"
          />
          
          {/* Area - Non-facturable */}
          <polygon
            points={`0,${chartHeight} ${nonFacturablePoints} ${chartWidth},${chartHeight}`}
            fill="url(#gradientNonFacturable)"
            opacity="0.3"
          />
          
          {/* Area - Attente */}
          <polygon
            points={`0,${chartHeight} ${attentePoints} ${chartWidth},${chartHeight}`}
            fill="url(#gradientAttente)"
            opacity="0.3"
          />

          {/* Lines */}
          <polyline
            points={facturablePoints}
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-md"
          />
          <polyline
            points={nonFacturablePoints}
            fill="none"
            stroke="#dc2626"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-md"
          />
          <polyline
            points={attentePoints}
            fill="none"
            stroke="#ff8c42"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-md"
          />

          {/* Dots */}
          {data.map((_, index) => {
            const x = (index / (data.length - 1)) * chartWidth;
            const yFacturable = chartHeight - (data[index].facturable / maxValue) * chartHeight;
            const yNonFacturable = chartHeight - (data[index].nonFacturable / maxValue) * chartHeight;
            const yAttente = chartHeight - (data[index].attente / maxValue) * chartHeight;
            
            return (
              <g key={index}>
                <circle cx={x} cy={yFacturable} r="3" fill="#16a34a" className="hover:r-5 transition-all cursor-pointer" />
                <circle cx={x} cy={yNonFacturable} r="3" fill="#dc2626" className="hover:r-5 transition-all cursor-pointer" />
                <circle cx={x} cy={yAttente} r="3" fill="#ff8c42" className="hover:r-5 transition-all cursor-pointer" />
              </g>
            );
          })}

          {/* Gradients */}
          <defs>
            <linearGradient id="gradientFacturable" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradientNonFacturable" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradientAttente" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff8c42" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ff8c42" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between -translate-x-12 text-xs text-gray-600">
          {[maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0].map((value, i) => (
            <span key={i}>{Math.round(value)}</span>
          ))}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-4 px-1">
        {data.map((item, index) => (
          <span key={index} className="text-sm text-gray-600 font-medium">
            {item.month}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-600" />
          <span className="text-sm text-gray-700">Facturable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-600" />
          <span className="text-sm text-gray-700">Non-facturable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-600" />
          <span className="text-sm text-gray-700">En attente</span>
        </div>
      </div>
    </div>
  );
}