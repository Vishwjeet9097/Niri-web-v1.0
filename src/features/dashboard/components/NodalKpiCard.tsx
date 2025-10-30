import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { InfoIcon } from "lucide-react";

interface NodalKpiCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  variant: "blue" | "red" | "orange" | "green";
}

const variantStyles = {
  blue: "border-l-4 border-l-blue-500 bg-white",
  red: "border-l-4 border-l-red-500 bg-white",
  orange: "border-l-4 border-l-orange-500 bg-white",
  green: "border-l-4 border-l-green-500 bg-white",
};

const iconBgStyles = {
  blue: "bg-blue-50 text-blue-600",
  red: "bg-red-50 text-red-600",
  orange: "bg-orange-50 text-orange-600",
  green: "bg-green-50 text-green-600",
};

export function NodalKpiCard({ title, value, subtitle, icon: Icon, variant }: NodalKpiCardProps) {
  return (
    <Card className={`p-4 ${variantStyles[variant]} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${iconBgStyles[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <InfoIcon className="w-4 h-4 text-gray-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-700">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </Card>
  );
}
