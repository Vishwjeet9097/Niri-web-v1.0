import React from "react";
import { Label } from "@/components/ui/label";
import {
  getCurrentFinancialYear,
  countOfficersTrainedInCurrentFY,
} from "@/utils/dateUtils";

interface TotalNumberOfOfficersTrainedProps {
  capacityArray?: Array<{ trainingPeriod?: string }>;
}

export const TotalNumberOfOfficersTrained: React.FC<
  TotalNumberOfOfficersTrainedProps
> = ({ capacityArray = [] }) => {
  // Total number of rows/entries saved
  const totalCount = Array.isArray(capacityArray) ? capacityArray.length : 0;
  
  // Count for current financial year
  const currentFYCount = countOfficersTrainedInCurrentFY(capacityArray);

  return (
    <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-baseline gap-2 flex-wrap">
        <Label className="text-base font-semibold text-gray-700 leading-none">
          Total Number of Officers Trained:
        </Label>
        <span className="text-2xl font-bold text-blue-600 leading-none">
          {totalCount}
        </span>
      </div>
      {currentFYCount > 0 && (
        <p className="text-sm text-gray-600 mt-1">
          {currentFYCount} officer(s) trained in current FY ({getCurrentFinancialYear()})
        </p>
      )}
    </div>
  );
};

