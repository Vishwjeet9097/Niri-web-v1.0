import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section3_4_PPPBankableProjectsProps {
  value?: number;
  onChange?: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function Section3_4_PPPBankableProjects({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section3_4_PPPBankableProjectsProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('3.4')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>3.4 PPP Bankable Projects</CardTitle>
        <p className="text-sm text-muted-foreground">
          Number of PPP Bankable Projects
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="pppBankableProjects" className="text-sm font-medium">
              Number of PPP Bankable Projects
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="pppBankableProjects"
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
            <p><strong>Description:</strong> Total number of bankable PPP projects in the state</p>
            <p><strong>Target:</strong> Maximum number of viable bankable projects</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
