import React from "react";

interface QuickTip {
  tip: string;
  detail: string;
}

interface NodalQuickTipsProps {
  tips: QuickTip[];
}

export default function NodalQuickTips({ tips }: NodalQuickTipsProps) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Quick Tips</h3>
      <p className="text-xs text-muted-foreground mb-6">
        Helpful hints to improve your workflow
      </p>
      <div className="space-y-4">
        {tips.map((tip, idx) => (
          <div key={idx} className="flex flex-col">
            <span className="font-medium text-sm">{tip.tip}</span>
            <span className="text-xs text-gray-500">{tip.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
