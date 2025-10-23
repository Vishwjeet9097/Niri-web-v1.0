import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface Section4_1_PMGPortalEligibleProps {
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function Section4_1_PMGPortalEligible({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}: Section4_1_PMGPortalEligibleProps) {
  const { hasIndicatorAccess } = useIndicatorAccess();

  // Check if user has access to this indicator
  if (!hasIndicatorAccess('4.1')) {
    return null; // Hide component if no access
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>4.1 All Eligible Infra Projects on NIP Portal</CardTitle>
        <p className="text-sm text-muted-foreground">
          Status of Eligible Infrastructure Projects on NIP Portal
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="pmgPortalEligible" className="text-sm font-medium">
              NIP Portal Project Status
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <select
              id="pmgPortalEligible"
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
              className={`w-full p-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'}`}
              disabled={disabled}
            >
              <option value="">Select status</option>
              <option value="all_uploaded">All Eligible Projects Uploaded</option>
              <option value="partially_uploaded">Partially Uploaded</option>
              <option value="under_process">Under Process</option>
              <option value="not_uploaded">Not Uploaded</option>
            </select>
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Description:</strong> Status of uploading all eligible infrastructure projects on the National Infrastructure Pipeline (NIP) portal</p>
            <p><strong>Target:</strong> All eligible projects uploaded on NIP portal</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
