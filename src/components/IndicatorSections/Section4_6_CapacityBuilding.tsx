import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section4_6_CapacityBuildingProps {
  value?: number;
  onChange?: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export function Section4_6_CapacityBuilding({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section4_6_CapacityBuildingProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('4.6')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>4.6 Capacity Building</CardTitle>
        <p className="text-sm text-muted-foreground">
          Number of Capacity Building Programs Conducted
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="capacityBuilding" className="text-sm font-medium">
              Number of Capacity Building Programs
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="capacityBuilding"
              type="number"
              value={value || ''}
              onChange={(e) => onChange?.(Number(e.target.value))}
              className={error ? 'border-red-500' : ''}
              placeholder="Enter number of programs"
              disabled={disabled}
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Description:</strong> Total number of capacity building programs conducted for infrastructure development</p>
            <p><strong>Target:</strong> Regular capacity building programs for all stakeholders</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
