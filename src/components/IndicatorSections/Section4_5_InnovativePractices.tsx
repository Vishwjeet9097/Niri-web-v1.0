import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section4_5_InnovativePracticesProps {
  value?: number;
  onChange?: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function Section4_5_InnovativePractices({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section4_5_InnovativePracticesProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('4.5')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>4.5 Innovative Practices</CardTitle>
        <p className="text-sm text-muted-foreground">
          Number of Innovative Infrastructure Practices Implemented
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="innovativePractices" className="text-sm font-medium">
              Number of Innovative Practices
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="innovativePractices"
              type="number"
              value={value || ''}
              onChange={(e) => onChange?.(Number(e.target.value))}
              className={error ? 'border-red-500' : ''}
              placeholder="Enter number of practices"
              disabled={disabled}
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Description:</strong> Total number of innovative practices implemented in infrastructure development</p>
            <p><strong>Target:</strong> Maximum number of innovative and best practices</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
