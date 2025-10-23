import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section1_1_CapexToGSDPProps {
  value?: number;
  onChange?: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function Section1_1_CapexToGSDP({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section1_1_CapexToGSDPProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('1.1')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1.1 Capex to GSDP Ratio</CardTitle>
        <p className="text-sm text-muted-foreground">
          Percentage of Capital Expenditure to Gross State Domestic Product
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="capexToGsdpRatio" className="text-sm font-medium">
              % of Capex to GSDP
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="capexToGsdpRatio"
              type="number"
              value={value || ''}
              onChange={(e) => onChange?.(Number(e.target.value))}
              className={error ? 'border-red-500' : ''}
              placeholder="Enter percentage"
              disabled={disabled}
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Calculation:</strong> (Total Capital Expenditure / GSDP) × 100</p>
            <p><strong>Target:</strong> Minimum 5% of GSDP</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
