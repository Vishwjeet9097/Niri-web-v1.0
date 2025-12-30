import React from "react";
import { CheckCircle } from "lucide-react";
import { Label } from "../../../components/ui/label";
import { MultiSelect } from "../../../components/ui/multi-select";
import { Badge } from "../../../components/ui/badge";

export type MinistryIndicatorsSectionProps = {
  ministryIndicators: any[];
  effectiveSubmittedIndicators: string[];
  loadingMinistryIndicators: boolean;
  ministryIndicatorsError: string | null;
  stateApproverHasSubmission: boolean;
  officer: any;
  nodalHasSubmission: boolean;
  checkingNodalSubmission: boolean;
  errors: Record<string, string>;
  assignedIndicators: string[];
  setFormData: (fn: (prev: any) => any) => void;
};

const MinistryIndicatorsSection: React.FC<MinistryIndicatorsSectionProps> = ({
  ministryIndicators,
  effectiveSubmittedIndicators,
  loadingMinistryIndicators,
  ministryIndicatorsError,
  stateApproverHasSubmission,
  officer,
  nodalHasSubmission,
  checkingNodalSubmission,
  errors,
  assignedIndicators,
  setFormData,
}) => {
  const [ministryAssignedIndicators, setMinistryAssignedIndicators] = React.useState<string[]>(assignedIndicators || []);
  const [ministryShowAllSelectedIndicators, setMinistryShowAllSelectedIndicators] = React.useState(false);

  React.useEffect(() => {
    setMinistryAssignedIndicators(assignedIndicators || []);
  }, [assignedIndicators]);

  const handleMinistryIndicatorChange = (selectedIndicators: string[]) => {
    setMinistryAssignedIndicators(selectedIndicators);
    setFormData((prev: any) => ({
      ...prev,
      assignedIndicators: selectedIndicators,
    }));
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        Ministry Assign Indicators
      </Label>
      {stateApproverHasSubmission && officer && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Indicator reassignment is disabled because you have already submitted your consolidated submission.
          </p>
        </div>
      )}
      {nodalHasSubmission && officer && !stateApproverHasSubmission && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800">
            <strong>Note:</strong> Indicator modification is disabled because this nodal officer has already submitted their submission. No indicator changes are allowed.
          </p>
        </div>
      )}
      {checkingNodalSubmission && (
        <p className="text-sm text-muted-foreground">
          Checking submission status...
        </p>
      )}
      {(() => {
        const submittedInOptions = (ministryIndicators || []).some(opt =>
          effectiveSubmittedIndicators.includes(opt.value) && opt.disabled
        );
        return submittedInOptions;
      })() && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Some indicators are disabled because they have already been submitted by the nodal officer in your state. These indicators cannot be reassigned to prevent duplicate submissions.
          </p>
        </div>
      )}
      <MultiSelect
        options={ministryIndicators}
        value={ministryAssignedIndicators}
        onChange={handleMinistryIndicatorChange}
        placeholder={
          loadingMinistryIndicators
            ? "Loading indicators..."
            : "Search and select indicators..."
        }
        searchPlaceholder="Type to search indicators..."
        showSearch={true}
        showSelectAll={!loadingMinistryIndicators}
        showSectionHeaders={true}
        groupBySection={true}
        className="w-full"
        maxHeight="250px"
        disabled={loadingMinistryIndicators || (stateApproverHasSubmission && !!officer) || (nodalHasSubmission && !!officer)}
      />
      {loadingMinistryIndicators && (
        <p className="text-sm text-muted-foreground mt-1">
          Fetching available indicators...
        </p>
      )}
      {ministryIndicatorsError && (
        <p className="text-sm text-destructive mt-1">{ministryIndicatorsError}</p>
      )}
      {errors.ministryAssignedIndicators && (
        <p className="text-sm text-destructive">
          {errors.ministryAssignedIndicators}
        </p>
      )}
      {ministryAssignedIndicators.length > 0 && (
        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Selected ({ministryAssignedIndicators.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(ministryShowAllSelectedIndicators
              ? ministryAssignedIndicators
              : ministryAssignedIndicators.slice(0, 3)
            ).map((indicator, index) => (
              <Badge
                key={`indicator-${index}-${indicator}`}
                variant="secondary"
                className="text-xs bg-blue-100 text-blue-800"
              >
                {indicator}
              </Badge>
            ))}
            {ministryAssignedIndicators.length > 3 &&
              !ministryShowAllSelectedIndicators && (
                <button
                  type="button"
                  onClick={() => setMinistryShowAllSelectedIndicators(true)}
                  className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                >
                  +{ministryAssignedIndicators.length - 3} more
                </button>
              )}
            {ministryShowAllSelectedIndicators &&
              ministryAssignedIndicators.length > 3 && (
                <button
                  type="button"
                  onClick={() => setMinistryShowAllSelectedIndicators(false)}
                  className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                >
                  Show less
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MinistryIndicatorsSection;
