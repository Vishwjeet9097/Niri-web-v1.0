import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section1_4_ULBsIssuingBondsProps {
  value?: number;
  onChange?: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function Section1_4_ULBsIssuingBonds({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section1_4_ULBsIssuingBondsProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('1.4')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1.4 ULBs Issuing Bonds</CardTitle>
        <p className="text-sm text-muted-foreground">
          Number of Urban Local Bodies Issuing Municipal Bonds
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="ulbsIssuingBonds" className="text-sm font-medium">
              Number of ULBs Issuing Bonds
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="ulbsIssuingBonds"
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
            <p><strong>Description:</strong> Total number of Urban Local Bodies that have issued municipal bonds</p>
            <p><strong>Target:</strong> Maximum number of eligible ULBs in the state</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
