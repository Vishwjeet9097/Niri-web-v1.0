/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface NodalKpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  variant: "red" | "orange" | "green" | "blue" | "yellow";
  description?: string;
}

// ✅ Separate card border color and icon background
const cardBorderMap = {
  red: "border-l-4 border-red-500",
  orange: "border-l-4 border-orange-500",
  green: "border-l-4 border-green-500",
  blue: "border-l-4 border-blue-500",
  yellow: "border-l-4 border-yellow-500",
};

const iconBgMap = {
  red: "bg-red-50 text-red-600",
  orange: "bg-orange-50 text-orange-600",
  green: "bg-green-50 text-green-600",
  blue: "bg-blue-50 text-blue-600",
  yellow: "bg-yellow-50 text-yellow-600",
};

export function NodalKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant,
  description,
}: NodalKpiCardProps) {
  return (
    <div
      className={`bg-white rounded-xl p-5 shadow-md flex flex-col justify-between ${cardBorderMap[variant]} transition-all hover:shadow-lg`}
    >
      {/* Header with icon + title + info tooltip */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${iconBgMap[variant]}`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`${title} info`}
              className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
            >
              <Info className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-[250px] text-sm bg-white text-gray-700 shadow-md border border-gray-200"
          >
            {description || "No description available"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* KPI Value */}
      <div className="mt-3">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
