import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";

interface Section1_2_CapexUtilizationProps {
  value?: number;
  onChange?: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function Section1_2_CapexUtilization({
  value,
  onChange,
  error,
  disabled = false,
}: Section1_2_CapexUtilizationProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess("1.2")) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1.2 Capex Utilization</CardTitle>
        <p className="text-sm text-muted-foreground">
          Percentage of Capital Expenditure Utilization
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="capexUtilization" className="text-sm font-medium">
              % Capex Utilization
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="capexUtilization"
              type="number"
              value={value || ""}
              onChange={(e) => onChange?.(Number(e.target.value))}
              className={error ? "border-red-500" : ""}
              placeholder="Enter percentage"
              disabled={disabled}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>

          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Calculation:</strong> (State Capex Utilisation / Capital
              Allocation for FY) × 100
            </p>
            <p>
              <strong>Target:</strong> Minimum 80% utilization
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
