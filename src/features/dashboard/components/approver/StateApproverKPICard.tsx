import { LucideIcon } from "lucide-react";

interface StateApproverKPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  variant: "blue" | "red" | "orange" | "green" | "yellow" | "purple";
}

const variantStyles = {
  blue: "border-l-blue-500 bg-blue-50",
  red: "border-l-red-500 bg-red-50",
  orange: "border-l-orange-500 bg-orange-50",
  green: "border-l-green-500 bg-green-50",
  yellow: "border-l-yellow-500 bg-yellow-50",
  purple: "border-l-purple-500 bg-purple-50",
};

const iconStyles = {
  blue: "text-blue-600 bg-blue-100",
  red: "text-red-600 bg-red-100",
  orange: "text-orange-600 bg-orange-100",
  green: "text-green-600 bg-green-100",
  yellow: "text-yellow-600 bg-yellow-100",
  purple: "text-purple-600 bg-purple-100",
};

export function StateApproverKPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant,
}: StateApproverKPICardProps) {
  return (
    <div
      className={`bg-white rounded-lg border-l-4 shadow-sm p-4 lg:p-6 ${variantStyles[variant]} min-h-[120px] flex flex-col`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded ${iconStyles[variant]}`}>
          <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <svg
            className="w-4 h-4 lg:w-5 lg:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>
      <div className="flex-1">
        <h3 className="text-xs lg:text-sm font-medium text-gray-700 mb-2 line-clamp-2">{title}</h3>
        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{value}</p>
        <p className="text-xs text-gray-600 line-clamp-2">{subtitle}</p>
      </div>
    </div>
  );
}
