import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section4_2_StatePMGPortalProps {
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function Section4_2_StatePMGPortal({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section4_2_StatePMGPortalProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('4.2')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>4.2 State PMG Portal</CardTitle>
        <p className="text-sm text-muted-foreground">
          Status of State Project Monitoring Group (PMG) Portal
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="statePmgPortal" className="text-sm font-medium">
              State PMG Portal Status
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <select
              id="statePmgPortal"
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
              className={`w-full p-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'}`}
              disabled={disabled}
            >
              <option value="">Select status</option>
              <option value="functional">Fully Functional</option>
              <option value="partially_functional">Partially Functional</option>
              <option value="under_development">Under Development</option>
              <option value="not_available">Not Available</option>
            </select>
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Description:</strong> Functional status of state-level Project Monitoring Group portal</p>
            <p><strong>Target:</strong> Fully functional state PMG portal</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
