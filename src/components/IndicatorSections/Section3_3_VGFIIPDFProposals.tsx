import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section3_3_VGFIIPDFProposalsProps {
  value?: number;
  onChange?: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function Section3_3_VGFIIPDFProposals({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section3_3_VGFIIPDFProposalsProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('3.3')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>3.3 VGF/IIPDF Proposals</CardTitle>
        <p className="text-sm text-muted-foreground">
          Number of VGF/IIPDF Proposals Submitted
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="vgfIipdfProposals" className="text-sm font-medium">
              Number of VGF/IIPDF Proposals
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="vgfIipdfProposals"
              type="number"
              value={value || ''}
              onChange={(e) => onChange?.(Number(e.target.value))}
              className={error ? 'border-red-500' : ''}
              placeholder="Enter number of proposals"
              disabled={disabled}
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Description:</strong> Total number of Viability Gap Funding (VGF) and India Infrastructure Project Development Fund (IIPDF) proposals submitted</p>
            <p><strong>Target:</strong> Maximum number of viable proposals</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
