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
 * Parse tooltip text and format section headers as bold
 * Supports markdown-style bold markers: **text** for custom bold sections
 */
const formatTooltipText = (text: string): React.ReactNode => {
  if (!text) return null;

  // Section headers that should be bold
  const sectionHeaders = [
    "Data Requirement:",
    "Data Validation & Calculation:",
    "Scoring Methodology:",
    "Documents Required:",
  ];

  // Process markdown-style bold markers **text**
  const processBoldMarkers = (str: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;
    let matchCount = 0;

    while ((match = regex.exec(str)) !== null) {
      // Add text before the bold marker
      if (match.index > lastIndex) {
        const textBefore = str.substring(lastIndex, match.index);
        if (textBefore) {
          parts.push(
            <span key={`text-${matchCount}`} className="font-normal">
              {textBefore}
            </span>
          );
        }
      }
      // Add bold text
      parts.push(
        <strong key={`bold-${matchCount}`} className="font-bold">
          {match[1]}
        </strong>
      );
      lastIndex = regex.lastIndex;
      matchCount++;
    }

    // Add remaining text
    if (lastIndex < str.length) {
      const remainingText = str.substring(lastIndex);
      if (remainingText) {
        parts.push(
          <span key={`text-${matchCount}`} className="font-normal">
            {remainingText}
          </span>
        );
      }
    }

    return parts.length > 0 ? parts : [str];
  };

  // Split text by double newlines to handle paragraphs
  const paragraphs = text.split(/\n\n+/);

  return (
    <div className="space-y-2">
      {paragraphs.map((paragraph, idx) => {
        const trimmedParagraph = paragraph.trim();

        // Check if paragraph starts with a section header
        const matchedHeader = sectionHeaders.find((header) =>
          trimmedParagraph.startsWith(header)
        );

        if (matchedHeader) {
          // Extract content after the header
          const content = trimmedParagraph
            .substring(matchedHeader.length)
            .trim();

          return (
            <div key={idx}>
              <strong className="font-bold">{matchedHeader}</strong>
              {content && (
                <span className="font-normal">
                  {" "}
                  {processBoldMarkers(content)}
                </span>
              )}
            </div>
          );
        }

        // Regular paragraph - check for bold markers
        const processedContent = processBoldMarkers(trimmedParagraph);
        return <div key={idx}>{processedContent}</div>;
      })}
    </div>
  );
};

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
          <div className="whitespace-normal">
            {formatTooltipText(tooltipText)}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
