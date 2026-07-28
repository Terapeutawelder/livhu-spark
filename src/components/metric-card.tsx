import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

export type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  hint?: string;
  trend?: number[];
};

const defaultTrend = [3, 5, 4, 6, 5, 7, 6, 8, 7, 9, 10, 12];

export function MetricCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaPositive = true,
  hint,
  trend = defaultTrend,
}: MetricCardProps) {
  const data = trend.map((v, i) => ({ i, v }));
  const gradId = `metric-grad-${label.replace(/\s+/g, "-")}`;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gold/25 bg-[oklch(0.14_0.01_80)] p-5 text-white shadow-[0_10px_30px_-15px_color-mix(in_oklab,var(--gold)_45%,transparent)] transition hover:border-gold/50 hover:shadow-[0_18px_40px_-15px_color-mix(in_oklab,var(--gold)_65%,transparent)]">
      {/* header */}
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
          {label}
        </p>
        <div className="grid h-9 w-9 place-items-center rounded-lg border border-gold/30 bg-gold/10 text-gold">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {/* value */}
      <p className="mt-4 font-display text-3xl font-bold tracking-tight text-white">
        {value}
      </p>

      {/* delta */}
      {(delta || hint) && (
        <div className="mt-1 flex items-center gap-1.5 text-xs">
          {delta && (
            <span
              className={
                deltaPositive
                  ? "inline-flex items-center gap-0.5 font-semibold text-emerald-400"
                  : "inline-flex items-center gap-0.5 font-semibold text-red-400"
              }
            >
              {deltaPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {delta}
            </span>
          )}
          {hint && <span className="text-white/50">{hint}</span>}
        </div>
      )}

      {/* sparkline */}
      <div className="pointer-events-none mt-4 -mx-5 -mb-5 h-16 opacity-90">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--color-gold)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke="var(--color-gold)"
              strokeWidth={2}
              fill={`url(#${gradId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
