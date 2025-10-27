import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section2_2_SpecializedEntityProps {
  value?: number;
  onChange?: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function Section2_2_SpecializedEntity({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section2_2_SpecializedEntityProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('2.2')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2.2 Specialized Entity</CardTitle>
        <p className="text-sm text-muted-foreground">
          Number of Specialized Infrastructure Entities
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="specializedEntity" className="text-sm font-medium">
              Number of Specialized Entities
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="specializedEntity"
              type="number"
              value={value || ''}
              onChange={(e) => onChange?.(Number(e.target.value))}
              className={error ? 'border-red-500' : ''}
              placeholder="Enter number of entities"
              disabled={disabled}
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Description:</strong> Total number of specialized infrastructure development entities in the state</p>
            <p><strong>Target:</strong> Minimum 1 specialized entity</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
