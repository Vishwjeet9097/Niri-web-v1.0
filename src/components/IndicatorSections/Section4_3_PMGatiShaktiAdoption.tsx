import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section4_3_PMGatiShaktiAdoptionProps {
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function Section4_3_PMGatiShaktiAdoption({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section4_3_PMGatiShaktiAdoptionProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('4.3')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>4.3 PM Gati Shakti Adoption</CardTitle>
        <p className="text-sm text-muted-foreground">
          Status of PM Gati Shakti Master Plan Adoption
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="pmGatiShaktiAdoption" className="text-sm font-medium">
              PM Gati Shakti Adoption Status
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <select
              id="pmGatiShaktiAdoption"
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
              className={`w-full p-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'}`}
              disabled={disabled}
            >
              <option value="">Select status</option>
              <option value="fully_adopted">Fully Adopted</option>
              <option value="partially_adopted">Partially Adopted</option>
              <option value="under_implementation">Under Implementation</option>
              <option value="not_adopted">Not Adopted</option>
            </select>
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Description:</strong> Adoption status of PM Gati Shakti Master Plan for infrastructure development</p>
            <p><strong>Target:</strong> Full adoption of PM Gati Shakti Master Plan</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
