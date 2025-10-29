import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section2_3_SectorInfraPlanProps {
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function Section2_3_SectorInfraPlan({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section2_3_SectorInfraPlanProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('2.3')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2.3 Sector Infrastructure Plan</CardTitle>
        <p className="text-sm text-muted-foreground">
          Status of Sector-wise Infrastructure Planning
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="sectorInfraPlan" className="text-sm font-medium">
              Sector Infrastructure Plan Status
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <select
              id="sectorInfraPlan"
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
              className={`w-full p-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'}`}
              disabled={disabled}
            >
              <option value="">Select status</option>
              <option value="comprehensive">Comprehensive Plan Available</option>
              <option value="partial">Partial Plan Available</option>
              <option value="under_development">Under Development</option>
              <option value="not_available">Not Available</option>
            </select>
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Description:</strong> Availability of comprehensive sector-wise infrastructure development plans</p>
            <p><strong>Target:</strong> Comprehensive sector infrastructure plans for all major sectors</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
