import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section1_3_CreditRatedULBsProps {
  value?: number;
  onChange?: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function Section1_3_CreditRatedULBs({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section1_3_CreditRatedULBsProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('1.3')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1.3 Credit Rated ULBs</CardTitle>
        <p className="text-sm text-muted-foreground">
          Number of Credit Rated Urban Local Bodies
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="creditRatedULBs" className="text-sm font-medium">
              Number of Credit Rated ULBs
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="creditRatedULBs"
              type="number"
              value={value || ''}
              onChange={(e) => onChange?.(Number(e.target.value))}
              className={error ? 'border-red-500' : ''}
              placeholder="Enter number of ULBs"
              disabled={disabled}
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Description:</strong> Total number of Urban Local Bodies that have received credit ratings</p>
            <p><strong>Target:</strong> Maximum number of ULBs in the state</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
