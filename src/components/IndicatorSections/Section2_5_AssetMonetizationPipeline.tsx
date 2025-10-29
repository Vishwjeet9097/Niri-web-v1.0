import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section2_5_AssetMonetizationPipelineProps {
  value?: number;
  onChange?: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function Section2_5_AssetMonetizationPipeline({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section2_5_AssetMonetizationPipelineProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('2.5')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2.5 Asset Monetization Pipeline</CardTitle>
        <p className="text-sm text-muted-foreground">
          Value of Assets in Monetization Pipeline (INR Crores)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="assetMonetizationPipeline" className="text-sm font-medium">
              Asset Monetization Value (INR Crores)
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="assetMonetizationPipeline"
              type="number"
              value={value || ''}
              onChange={(e) => onChange?.(Number(e.target.value))}
              className={error ? 'border-red-500' : ''}
              placeholder="Enter value in crores"
              disabled={disabled}
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Description:</strong> Total value of assets identified for monetization in the pipeline</p>
            <p><strong>Target:</strong> Maximum value of monetizable assets</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
