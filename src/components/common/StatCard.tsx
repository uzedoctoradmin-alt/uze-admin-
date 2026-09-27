import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  icon?: LucideIcon;
  isGoldAccent?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendLabel = 'vs. período anterior',
  icon: Icon,
}) => {
  return (
    <div className="bg-white border border-[#D0D5DD] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#344054]">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-md bg-[#EFF4FF] border border-[#D0D5DD] text-[#173E75] flex items-center justify-center">
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl font-black tracking-tight text-[#101828]">
          {value}
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-xs">
          {trend !== undefined ? (
            <div className="flex items-center gap-1 font-semibold">
              {trend >= 0 ? (
                <span className="inline-flex items-center text-[#027A48] font-bold">
                  <TrendingUp size={13} className="mr-0.5" /> +{trend.toFixed(1)}%
                </span>
              ) : (
                <span className="inline-flex items-center text-[#B42318] font-bold">
                  <TrendingDown size={13} className="mr-0.5" /> {trend.toFixed(1)}%
                </span>
              )}
              <span className="text-[#475467] font-medium">{trendLabel}</span>
            </div>
          ) : subtitle ? (
            <span className="text-[#475467] text-xs font-medium">{subtitle}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};
