import React from 'react';
import { COLORS } from '../theme';

/**
 * Option payoff-at-expiry diagram (the classic "hockey stick").
 *   Call payoff = max(S − K, 0) − premium
 *   Put  payoff = max(K − S, 0) − premium
 * Plotted across a range of underlying prices S.
 */
const PayoffChart = ({ optionType = 'CALL', strike, premium, spot, width = 320, height = 180 }) => {
  const K = Number(strike);
  const prem = Number(premium);
  const center = Number(spot) || K;

  const lo = center * 0.8;
  const hi = center * 1.2;
  const steps = 60;

  const payoff = (S) => (optionType === 'CALL'
    ? Math.max(S - K, 0) - prem
    : Math.max(K - S, 0) - prem);

  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const S = lo + (hi - lo) * (i / steps);
    pts.push({ S, p: payoff(S) });
  }

  const pad = 24;
  const minP = Math.min(...pts.map(d => d.p));
  const maxP = Math.max(...pts.map(d => d.p));
  const yRange = (maxP - minP) || 1;

  const x = (S) => pad + ((S - lo) / (hi - lo)) * (width - 2 * pad);
  const y = (p) => pad + (1 - (p - minP) / yRange) * (height - 2 * pad);

  const line = pts.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(d.S).toFixed(1)},${y(d.p).toFixed(1)}`).join(' ');
  const breakeven = optionType === 'CALL' ? K + prem : K - prem;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="option payoff diagram">
      {/* zero P&L line */}
      <line x1={pad} y1={y(0)} x2={width - pad} y2={y(0)} stroke={COLORS.border} strokeDasharray="4 4" />
      <text x={pad} y={y(0) - 4} fill={COLORS.textDim} fontSize="9">break-even ₹{breakeven.toFixed(1)}</text>
      {/* strike marker */}
      <line x1={x(K)} y1={pad} x2={x(K)} y2={height - pad} stroke="rgba(245,158,11,0.5)" strokeDasharray="3 3" />
      <text x={x(K) + 3} y={pad + 9} fill={COLORS.warn} fontSize="9">K ₹{K.toFixed(0)}</text>
      {/* spot marker */}
      <line x1={x(center)} y1={pad} x2={x(center)} y2={height - pad} stroke="rgba(6,182,212,0.5)" strokeDasharray="3 3" />
      <text x={x(center) + 3} y={height - pad - 3} fill={COLORS.info} fontSize="9">spot</text>
      {/* payoff line */}
      <path d={line} fill="none" stroke={COLORS.accent} strokeWidth="2" />
    </svg>
  );
};

export default PayoffChart;
