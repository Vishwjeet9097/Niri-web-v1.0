import React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getIndicatorTooltip } from "@/utils/indicatorTooltips";
import { cn } from "@/lib/utils";

interface IndicatorTooltipProps {
  indicatorCode: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Reusable tooltip component for indicators
 * Displays an "i" icon that shows detailed tooltip text on hover
 */
export const IndicatorTooltip: React.FC<IndicatorTooltipProps> = ({
  indicatorCode,
  className,
  iconClassName,
}) => {
  const tooltipText = getIndicatorTooltip(indicatorCode);

  // Don't render if no tooltip text is available
  if (!tooltipText) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
              className
            )}
            aria-label={`Tooltip for indicator ${indicatorCode}`}
          >
            <Info
              className={cn(
                "w-4 h-4 text-muted-foreground hover:text-primary cursor-help",
                iconClassName
              )}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-md p-3 text-sm leading-relaxed z-50"
        >
          <p className="whitespace-normal">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
