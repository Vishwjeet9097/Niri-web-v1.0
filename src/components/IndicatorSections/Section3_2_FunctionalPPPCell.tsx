import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section3_2_FunctionalPPPCellProps {
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function Section3_2_FunctionalPPPCell({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section3_2_FunctionalPPPCellProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('3.2')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>3.2 Functional PPP Cell/Unit</CardTitle>
        <p className="text-sm text-muted-foreground">
          Status of Functional PPP Cell or Unit
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="pppCell" className="text-sm font-medium">
              PPP Cell/Unit Status
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <select
              id="pppCell"
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
              className={`w-full p-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'}`}
              disabled={disabled}
            >
              <option value="">Select status</option>
              <option value="functional">Functional</option>
              <option value="partially_functional">Partially Functional</option>
              <option value="under_setup">Under Setup</option>
              <option value="not_available">Not Available</option>
            </select>
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Description:</strong> Functional status of dedicated PPP cell or unit in the state</p>
            <p><strong>Target:</strong> Fully functional PPP cell/unit</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
