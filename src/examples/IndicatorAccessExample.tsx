import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';
import { IndicatorSection } from '@/components/IndicatorSection';
import { Section1_1_CapexToGSDP } from '@/components/IndicatorSections/Section1_1_CapexToGSDP';
import { Section1_2_CapexUtilization } from '@/components/IndicatorSections/Section1_2_CapexUtilization';
import { filterFormDataByIndicators } from '@/utils/indicatorUtils';
import { AlertTriangle, Lock, CheckCircle } from 'lucide-react';

/**
 * Example component demonstrating role-based indicator access control
 * This shows how to implement the complete system for NODAL_OFFICER role
 */
export function IndicatorAccessExample() {
  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    loading,
    error,
    assignedIndicators,
    hasAnyAccess,
    getAvailableSections,
    getRestrictedSections,
    isNodalOfficer
  } = useIndicatorAccess();

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = () => {
    if (isNodalOfficer && assignedIndicators.length > 0) {
      // Filter form data to only include assigned indicators
      const filteredData = filterFormDataByIndicators(formData, assignedIndicators);
      console.log('Filtered form data:', filteredData);
      
      // Submit only the filtered data
      alert(`Submitting data for indicators: ${assignedIndicators.join(', ')}`);
    } else {
      // Submit all data for other roles
      console.log('Submitting all form data:', formData);
      alert('Submitting all form data');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2">Loading your assigned indicators...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading indicator access: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No access state for NODAL_OFFICER
  if (isNodalOfficer && !hasAnyAccess()) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            आपको कोई भी indicator assign नहीं किया गया है। कृपया अपने administrator से संपर्क करें।
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const availableSections = getAvailableSections();
  const restrictedSections = getRestrictedSections();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>NIRI Indicator Access Control Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Role and Access Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold">User Role</h3>
              <p className="text-sm text-muted-foreground">
                {isNodalOfficer ? 'NODAL_OFFICER' : 'Other Role'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Assigned Indicators</h3>
              <p className="text-sm text-muted-foreground">
                {assignedIndicators.length > 0 ? assignedIndicators.join(', ') : 'All indicators'}
              </p>
            </div>
          </div>

          {/* Available Sections */}
          {availableSections.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Available Sections</h3>
              <div className="flex flex-wrap gap-2">
                {availableSections.map(section => (
                  <span key={section.id} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                    {section.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Restricted Sections */}
          {restrictedSections.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Restricted Sections</h3>
              <div className="flex flex-wrap gap-2">
                {restrictedSections.map(sectionId => (
                  <span key={sectionId} className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                    {sectionId}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Example Form Sections */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Form Sections</h2>
        
        {/* Infrastructure Financing Section */}
        <IndicatorSection 
          sectionId="infra-financing" 
          title="Infrastructure Financing"
        >
          <div className="space-y-4">
            <Section1_1_CapexToGSDP
              value={typeof formData.capexToGsdpRatio === 'number' ? formData.capexToGsdpRatio : undefined}
              onChange={(value) => handleInputChange('capexToGsdpRatio', value)}
              error={errors.capexToGsdpRatio}
            />
            
            <Section1_2_CapexUtilization
              value={typeof formData.capexUtilization === 'number' ? formData.capexUtilization : undefined}
              onChange={(value) => handleInputChange('capexUtilization', value)}
              error={errors.capexUtilization}
            />
          </div>
        </IndicatorSection>

        {/* Example of a section that might be hidden */}
        <IndicatorSection 
          sectionId="infra-development" 
          title="Infrastructure Development"
          showAccessDenied={false} // Hide completely if no access
        >
          <div className="p-4 bg-gray-50 rounded">
            <p className="text-sm text-muted-foreground">
              This section would contain infrastructure development indicators.
              It will be hidden completely if the user doesn't have access.
            </p>
          </div>
        </IndicatorSection>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit}>
          Submit Form
        </Button>
      </div>

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify({
              isNodalOfficer,
              assignedIndicators,
              availableSections: availableSections.map(s => s.id),
              restrictedSections,
              formData
            }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
