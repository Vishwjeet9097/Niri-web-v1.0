import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section3_1_PPPActPolicyProps {
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function Section3_1_PPPActPolicy({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section3_1_PPPActPolicyProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('3.1')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>3.1 PPP Act/Policy</CardTitle>
        <p className="text-sm text-muted-foreground">
          Status of PPP Act or Policy Implementation
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="pppActPolicy" className="text-sm font-medium">
              PPP Act/Policy Status
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <select
              id="pppActPolicy"
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
              className={`w-full p-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'}`}
              disabled={disabled}
            >
              <option value="">Select status</option>
              <option value="implemented">Implemented</option>
              <option value="draft">Draft</option>
              <option value="under_consideration">Under Consideration</option>
              <option value="not_available">Not Available</option>
            </select>
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Description:</strong> Availability and implementation status of state PPP act or policy</p>
            <p><strong>Target:</strong> Fully implemented PPP act/policy</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
