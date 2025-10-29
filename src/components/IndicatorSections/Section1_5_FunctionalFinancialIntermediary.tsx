import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section1_5_FunctionalFinancialIntermediaryProps {
  value?: number;
  onChange?: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function Section1_5_FunctionalFinancialIntermediary({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section1_5_FunctionalFinancialIntermediaryProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('1.5')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1.5 Functional Financial Intermediary</CardTitle>
        <p className="text-sm text-muted-foreground">
          Number of Functional Financial Intermediaries
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="functionalFinancialIntermediary" className="text-sm font-medium">
              Number of Functional Financial Intermediaries
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="functionalFinancialIntermediary"
              type="number"
              value={value || ''}
              onChange={(e) => onChange?.(Number(e.target.value))}
              className={error ? 'border-red-500' : ''}
              placeholder="Enter number of intermediaries"
              disabled={disabled}
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Description:</strong> Total number of functional financial intermediaries in the state</p>
            <p><strong>Target:</strong> Minimum 1 functional intermediary</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
