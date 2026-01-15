import { LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MinistryApproverKPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  variant: "blue" | "brown" | "green" | "yellow" | "orange" | "red";
}

// ✅ Updated exact hex colors
const variantStyles = {
  blue: "border-l-[4px] border-[#1E40AF] bg-white",
  brown: "border-l-[4px] border-[#B77224] bg-white",
  green: "border-l-[4px] border-[#3C9718] bg-white",
  yellow: "border-l-[4px] border-[#EDBB15] bg-white", 
  orange: "border-l-[4px] border-[#F56D0A] bg-white",
  red: "border-l-[4px] border-[#AF1E58] bg-white",
};

// ✅ Icon circle background + color tint
const iconStyles = {
  blue: "bg-[#1E40AF]/10 text-[#1E40AF]",
  brown: "bg-[#B77224]/10 text-[#B77224]",
  green: "bg-[#3C9718]/10 text-[#3C9718]",
  yellow: "bg-[#EDBB15]/10 text-[#EDBB15]",
  orange: "bg-[#F56D0A]/10 text-[#F56D0A]",
  red: "bg-[#AF1E58]/10 text-[#AF1E58]",
};

// ✅ Tooltip descriptions
const tooltipDescriptions: Record<string, string> = {
  "Total Assigned":
    "Total number of indicators assigned to the Nodal Officer by the Ministry Approver.",
  "Pending Submission":
    "Total number of Indicator pending for submissions by Nodal/Ministry",
  "Accepted From Nodal Officer":
    "Number of assigned indicators for which the Nodal Officer has submitted data.",
  "Returned to Nodal Officer":
    "Indicators returned by the Ministry Approver for correction or clarification.",
  "Submitted to MoSPI":
    "Number of complete forms submitted by the Ministry Approver to MoSPI after all indicator approvals.",
  "Returned from MoSPI":
    "Forms reviewed at the MoSPI level and sent back to the Ministry Approver for revision.",
  "Approved by MoSPI":
    "Forms reviewed and approved at the MoSPI level after validation.",
};

export function MinistryApproverKPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant,
}: MinistryApproverKPICardProps) {
  const tooltipText = tooltipDescriptions[title] || title;

  return (
    <div
      className={`rounded-lg shadow-sm px-4 py-3 ${variantStyles[variant]} min-h-[120px] flex flex-col justify-between transition-all duration-200 hover:shadow-md`}
    >
      {/* Top Row: Icon + Tooltip */}
      <div className="flex items-start justify-between mb-3">
        <div
          className={`p-2 rounded-md flex items-center justify-center ${iconStyles[variant]}`}
        >
          <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
        </div>

        {/* Tooltip */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
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
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-[250px] text-sm bg-white text-gray-700 shadow-md border border-gray-200"
            >
              {tooltipText}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Main Text */}
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-[#212121] mb-1 line-clamp-2">
          {title}
        </h3>
        <p className="text-xl lg:text-xl font-bold text-[#212121] mb-1">
          {value}
        </p>
        <p className="text-xs text-[#727272] line-clamp-2">{subtitle}</p>
      </div>
    </div>
  );
}
