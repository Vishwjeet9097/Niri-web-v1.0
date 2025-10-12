import React from "react";

interface KpiCardData {
  label: string;
  value: number;
  subtitle: string;
  color: string;
  icon: string;
}

interface NodalKpiCardsProps {
  data: KpiCardData[];
}

const colorMap: Record<string, string> = {
  blue: "border-blue-200 text-blue-700",
  red: "border-red-200 text-red-700",
  orange: "border-orange-200 text-orange-700",
  green: "border-green-200 text-green-700",
  pink: "border-pink-200 text-pink-700",
  yellow: "border-yellow-200 text-yellow-700",
};

export default function NodalKpiCards({ data }: NodalKpiCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {data.slice(0, 4).map((kpi, idx) => (
        <div
          key={idx}
          className={`rounded-lg shadow-sm p-4 flex flex-col border bg-white ${colorMap[kpi.color] || "border-gray-200"}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{kpi.icon}</span>
            <span className="font-bold text-lg">{kpi.value}</span>
          </div>
          <div className="font-medium text-gray-700">{kpi.label}</div>
          <div className={`text-xs ${colorMap[kpi.color] || "text-gray-600"}`}>{kpi.subtitle}</div>
        </div>
      ))}
    </div>
  );
}
