import React from "react";

const stageData = [
  {
    label: "MoSPI Reviewer Stage",
    description: "Under review by MoSPI reviewers",
    value: 12,
  },
  {
    label: "Final Approval Stage",
    description: "Under review by MoSPI approvers",
    value: 8,
  },
];

export default function ApproverStageSubmissions() {
  return (
    <div className="bg-white rounded-xl shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">MoSPI Stage Submissions</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Submissions currently at MoSPI Reviewer and Final Approval stages.
      </p>
      <div className="space-y-4">
        {stageData.map((stage, idx) => (
          <div key={stage.label} className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{stage.label}</div>
              <div className="text-xs text-muted-foreground">{stage.description}</div>
            </div>
            <div className="text-2xl font-bold text-blue-700">{stage.value}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-6">
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
          View All
        </button>
      </div>
    </div>
  );
}
