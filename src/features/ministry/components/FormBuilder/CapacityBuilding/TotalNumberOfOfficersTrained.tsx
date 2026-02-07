import React from "react";
import { Label } from "@/components/ui/label";
import {
  getCurrentFinancialYear,
  countOfficersTrainedInCurrentFY,
} from "@/utils/dateUtils";

interface TotalNumberOfOfficersTrainedProps {
  capacityArray?: Array<Record<string, unknown>>;
}

export const TotalNumberOfOfficersTrained: React.FC<
  TotalNumberOfOfficersTrainedProps
> = ({ capacityArray = [] }) => {
  const entries = Array.isArray(capacityArray) ? capacityArray : [];
  // Only officers trained in the current Financial Year are counted
  const currentFYCount = countOfficersTrainedInCurrentFY(entries);

  return (
    <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-baseline gap-2 flex-wrap">
        <Label className="text-base font-semibold text-gray-700 leading-none">
          Total Number of Officers Trained (Current FY only):
        </Label>
        <span className="text-2xl font-bold text-blue-600 leading-none">
          {currentFYCount}
        </span>
      </div>
      <p className="text-sm text-gray-600 mt-1">
        Only officers whose training period falls in current Financial Year ({getCurrentFinancialYear()}) are counted. Entries outside this period are excluded.
      </p>
    </div>
  );
};

