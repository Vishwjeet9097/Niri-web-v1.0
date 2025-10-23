import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section2_1_InfrastructureActPolicyProps {
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function Section2_1_InfrastructureActPolicy({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section2_1_InfrastructureActPolicyProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('2.1')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2.1 Availability of Infrastructure Act/Policy</CardTitle>
        <p className="text-sm text-muted-foreground">
          Status of Infrastructure Act or Policy Implementation
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="infrastructureActPolicy" className="text-sm font-medium">
              Infrastructure Act/Policy Status
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <select
              id="infrastructureActPolicy"
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
            <p><strong>Description:</strong> Availability and implementation status of state infrastructure act or policy</p>
            <p><strong>Target:</strong> Fully implemented infrastructure act/policy</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
