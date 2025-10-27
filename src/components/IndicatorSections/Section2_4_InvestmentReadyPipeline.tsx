import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section2_4_InvestmentReadyPipelineProps {
  value?: number;
  onChange?: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function Section2_4_InvestmentReadyPipeline({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section2_4_InvestmentReadyPipelineProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('2.4')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2.4 Investment Ready Project Pipeline</CardTitle>
        <p className="text-sm text-muted-foreground">
          Number of Investment Ready Projects in Pipeline
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="investmentReadyPipeline" className="text-sm font-medium">
              Number of Investment Ready Projects
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="investmentReadyPipeline"
              type="number"
              value={value || ''}
              onChange={(e) => onChange?.(Number(e.target.value))}
              className={error ? 'border-red-500' : ''}
              placeholder="Enter number of projects"
              disabled={disabled}
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Description:</strong> Total number of investment ready infrastructure projects in the pipeline</p>
            <p><strong>Target:</strong> Maximum number of viable projects</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
