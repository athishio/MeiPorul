import React from 'react';
import { Summary, Claim } from '../types';
import { getClaimSourceInfo } from '../utils/sourceHelper';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity, ShieldCheck, AlertOctagon, HelpCircle, Gauge, Globe } from 'lucide-react';

interface SummaryBarProps {
  summary: Summary;
  claims?: Claim[];
}

export const SummaryBar: React.FC<SummaryBarProps> = ({ summary, claims = [] }) => {
  // Aggregate evidence sources across claims (Requirement #3)
  const sourceCounts: Record<string, number> = {};
  claims.forEach((claim) => {
    const info = getClaimSourceInfo(claim);
    let key = info.domain;
    if (!key) {
      key = info.name.split(':')[0].trim();
    }
    // Clean up domain nicely for display: e.g. en.wikipedia.org -> Wikipedia
    if (key.includes('wikipedia')) key = 'Wikipedia';
    else if (key.includes('nobelprize')) key = 'Nobel Prize';
    else if (key.includes('genome.gov') || key.includes('nhgri')) key = 'NHGRI';
    else if (key.includes('nasa.gov')) key = 'NASA';
    else if (key.includes('nationalgeographic')) key = 'National Geographic';

    sourceCounts[key] = (sourceCounts[key] || 0) + 1;
  });

  const sourceEntries = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
  // Chart data using strictly the 3 verdict colors, filtered to positive values
  const chartData = [
    { name: 'Supported', value: summary.percent_supported, color: '#3ddc84' },
    { name: 'Contradicted', value: summary.percent_contradicted, color: '#ff4d4d' },
    { name: 'Not Enough Info', value: summary.percent_not_enough_info, color: '#9f9b92' },
  ].filter((item) => item.value > 0);

  return (
    <div className="bg-[#201c19] border border-[rgba(255,255,255,0.1)] p-5">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#ed670f]" />
          <h2 className="text-[18px] font-bold text-white font-display uppercase tracking-tight">
            SIGNAL INTEGRITY AUDIT // TELEMETRY
          </h2>
        </div>
        <div className="text-xs font-mono text-[#9f9b92]">
          STATUS: <span className="text-[#3ddc84]">AUDITED</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Compact Stat Row: 5 Metric Cards */}
        <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* TOTAL CLAIMS */}
          <div className="p-3 bg-[#16120f] border border-[rgba(255,255,255,0.1)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-[#9f9b92] uppercase mb-1">
              <span>TOTAL</span>
              <Activity className="h-3.5 w-3.5 text-[#cecdc9]" />
            </div>
            <div className="text-2xl font-bold font-display text-white">
              {summary.total_claims}
            </div>
            <div className="text-[11px] font-mono text-[#9f9b92] mt-1">
              atomic claims
            </div>
          </div>

          {/* SUPPORTED */}
          <div className="p-3 bg-[#16120f] border border-[#3ddc84]/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-[#3ddc84] uppercase mb-1">
              <span>SUPPORTED</span>
              <ShieldCheck className="h-3.5 w-3.5 text-[#3ddc84]" />
            </div>
            <div className="text-2xl font-bold font-display text-[#3ddc84]">
              {summary.percent_supported}%
            </div>
            <div className="text-[11px] font-mono text-[#3ddc84]/70 mt-1">
              signal verified
            </div>
          </div>

          {/* CONTRADICTED */}
          <div className="p-3 bg-[#16120f] border border-[#ff4d4d]/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-[#ff4d4d] uppercase mb-1">
              <span>CONTRADICTED</span>
              <AlertOctagon className="h-3.5 w-3.5 text-[#ff4d4d]" />
            </div>
            <div className="text-2xl font-bold font-display text-[#ff4d4d]">
              {summary.percent_contradicted}%
            </div>
            <div className="text-[11px] font-mono text-[#ff4d4d]/70 mt-1">
              signal fault
            </div>
          </div>

          {/* NEI */}
          <div className="p-3 bg-[#16120f] border border-[rgba(255,255,255,0.1)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-[#9f9b92] uppercase mb-1">
              <span>NEI</span>
              <HelpCircle className="h-3.5 w-3.5 text-[#9f9b92]" />
            </div>
            <div className="text-2xl font-bold font-display text-[#9f9b92]">
              {summary.percent_not_enough_info}%
            </div>
            <div className="text-[11px] font-mono text-[#9f9b92] mt-1">
              no signal
            </div>
          </div>

          {/* AVG CONFIDENCE */}
          <div className="col-span-2 sm:col-span-1 p-3 bg-[#16120f] border border-[rgba(255,255,255,0.1)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-[#cecdc9] uppercase mb-1">
              <span>AVG CONF</span>
              <Gauge className="h-3.5 w-3.5 text-[#ed670f]" />
            </div>
            <div className="text-2xl font-bold font-display text-[#fff]">
              {(summary.avg_confidence * 100).toFixed(1)}%
            </div>
            <div className="text-[11px] font-mono text-[#9f9b92] mt-1">
              calibrated score
            </div>
          </div>
        </div>

        {/* Recharts CRT Donut Summary Chart */}
        <div className="lg:col-span-3 p-3 bg-[#16120f] border border-[rgba(255,255,255,0.1)] flex items-center justify-between gap-2">
          <div className="w-[100px] h-[100px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={28}
                  outerRadius={45}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="#16120f"
                  strokeWidth={1.5}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      return (
                        <div className="bg-[#201c19] border border-[rgba(255,255,255,0.2)] px-2 py-1 text-xs font-mono text-white shadow-none">
                          <span style={{ color: data.payload.color }}>
                            {data.name}:
                          </span>{" "}
                          {data.value}%
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs font-mono flex-1">
            <div className="text-[11px] text-[#9f9b92] uppercase tracking-wider mb-1">
              RATIO DISTRIBUTION
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-[#3ddc84]"></span>
              <span className="text-[#3ddc84] text-[11px]">
                OK ({summary.percent_supported}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-[#ff4d4d]"></span>
              <span className="text-[#ff4d4d] text-[11px]">
                FAULT ({summary.percent_contradicted}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-[#9f9b92]"></span>
              <span className="text-[#9f9b92] text-[11px]">
                NEI ({summary.percent_not_enough_info}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sources Summary Strip (Requirement #3) */}
      {sourceEntries.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-[rgba(255,255,255,0.08)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#9f9b92] uppercase flex items-center gap-1.5 font-bold">
              <Globe className="h-3.5 w-3.5 text-[#ed670f]" />
              <span>SOURCES AUDITED:</span>
            </span>

            {sourceEntries.map(([sourceName, count], idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] bg-[#16120f] border border-[rgba(255,255,255,0.12)] text-[#cecdc9] text-xs hover:border-[#ed670f]/50 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#3ddc84]" />
                <span className="text-white font-medium">{sourceName}</span>
                <span className="text-[#ed670f] font-bold">({count})</span>
              </span>
            ))}
          </div>

          <div className="text-[11px] font-mono text-[#9f9b92] flex items-center gap-2">
            <span>PROVENANCE CHECKED</span>
            <span>•</span>
            <span className="text-[#3ddc84]">100% EVIDENCE BOUND</span>
          </div>
        </div>
      )}
    </div>
  );
};
