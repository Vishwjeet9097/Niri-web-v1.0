import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/features/auth/AuthProvider';
import { transformFormDataToNiriSubmission, validateNiriSubmission, transformNiriSubmissionToFormData } from '@/utils/submissionTransformer';
import { apiService } from '@/services/api.service';
import { useToast } from '@/hooks/use-toast';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';
import { IndicatorSection } from '@/components/IndicatorSection';
import { filterFormDataByIndicators, validateFormDataAccess } from '@/utils/indicatorUtils';
import { Download, RefreshCw, AlertTriangle, Lock } from 'lucide-react';
// Removed mock data import - using actual API data

interface NiriSubmissionFormProps {
  onSuccess?: (submission: any) => void;
  onCancel?: () => void;
}

export function NiriSubmissionForm({ onSuccess, onCancel }: NiriSubmissionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Indicator access control
  const {
    loading: indicatorLoading,
    error: indicatorError,
    assignedIndicators,
    hasAnyAccess,
    getFirstAvailableSection,
    isNodalOfficer
  } = useIndicatorAccess();

  // Initialize form with default values
  useEffect(() => {
    const defaultValues = {
      // Infrastructure Financing
      capexToGsdpRatio: '',
      capexUtilization: '',
      creditRatedULBs: '',
      ulbsIssuingBonds: '',
      functionalFinancialIntermediary: '',
      
      // Infrastructure Development
      infrastructureActPolicy: '',
      specializedEntity: '',
      sectorInfraPlan: '',
      investmentReadyPipeline: '',
      assetMonetizationPipeline: '',
      
      // PPP Development
      pppActPolicy: '',
      pppCell: '',
      vgfIipdfProposals: '',
      pppBankableProjects: '',
      
      // Infrastructure Enablers
      pmgPortalEligible: '',
      statePmgPortal: '',
      pmGatiShaktiAdoption: '',
      adrAdoption: '',
      innovativePractices: '',
      capacityBuilding: ''
    };
    
    setFormData(defaultValues);
  }, []);

  const handleInputChange = (field: string, value: any) => {
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // For NODAL_OFFICER, only validate assigned indicators
    if (isNodalOfficer && assignedIndicators.length > 0) {
      // Validate form data access
      const accessValidation = validateFormDataAccess(formData, assignedIndicators);
      if (!accessValidation.isValid) {
        toast({
          title: "Access Denied",
          description: `You don't have access to indicators: ${accessValidation.unauthorizedFields.join(', ')}`,
          variant: "destructive"
        });
        return false;
      }

      // Only validate assigned indicator fields
      const fieldToIndicatorMap: Record<string, string> = {
        'capexToGsdpRatio': '1.1',
        'capexUtilization': '1.2',
        'creditRatedULBs': '1.3',
        'ulbsIssuingBonds': '1.4',
        'functionalFinancialIntermediary': '1.5',
        'infrastructureActPolicy': '2.1',
        'specializedEntity': '2.2',
        'sectorInfraPlan': '2.3',
        'investmentReadyPipeline': '2.4',
        'assetMonetizationPipeline': '2.5',
        'pppActPolicy': '3.1',
        'pppCell': '3.2',
        'vgfIipdfProposals': '3.3',
        'pppBankableProjects': '3.4',
        'pmgPortalEligible': '4.1',
        'statePmgPortal': '4.2',
        'pmGatiShaktiAdoption': '4.3',
        'adrAdoption': '4.4',
        'innovativePractices': '4.5',
        'capacityBuilding': '4.6'
      };

      // Only validate fields that user has access to
      Object.entries(fieldToIndicatorMap).forEach(([field, indicator]) => {
        if (assignedIndicators.includes(indicator)) {
          if (!formData[field] || formData[field] === '') {
            newErrors[field] = 'This field is required';
          }
        }
      });
    } else {
      // For other roles, validate all fields
      const requiredFields = [
        'capexToGsdpRatio', 'capexUtilization', 'creditRatedULBs', 'ulbsIssuingBonds',
        'functionalFinancialIntermediary', 'infrastructureActPolicy', 'specializedEntity',
        'sectorInfraPlan', 'investmentReadyPipeline', 'assetMonetizationPipeline',
        'pppActPolicy', 'pppCell', 'vgfIipdfProposals', 'pppBankableProjects',
        'pmgPortalEligible', 'statePmgPortal', 'pmGatiShaktiAdoption', 'adrAdoption',
        'innovativePractices', 'capacityBuilding'
      ];
      
      requiredFields.forEach(field => {
        if (!formData[field] || formData[field] === '') {
          newErrors[field] = 'This field is required';
        }
      });
    }
    
    // Number validation for numeric fields
    const numericFields = [
      'capexToGsdpRatio', 'capexUtilization', 'creditRatedULBs', 'ulbsIssuingBonds',
      'sectorInfraPlan', 'vgfIipdfProposals', 'pppBankableProjects', 'pmGatiShaktiAdoption',
      'innovativePractices', 'capacityBuilding'
    ];
    
    numericFields.forEach(field => {
      if (formData[field] && isNaN(Number(formData[field]))) {
        newErrors[field] = 'Please enter a valid number';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePrefillData = () => {
    try {
      // TODO: Replace with actual API call to get prefill data
      // const prefillData = await apiService.getPrefillData();
      toast({
        title: "Prefill Data",
        description: "Prefill functionality will be implemented with actual API data",
        variant: "default",
      });
    } catch (error) {
      console.error("❌ Prefill Error:", error);
      toast({
        title: "Error",
        description: "Failed to prefill form data",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // For NODAL_OFFICER, filter form data to only include assigned indicators
      let submissionData = formData;
      if (isNodalOfficer && assignedIndicators.length > 0) {
        submissionData = filterFormDataByIndicators(formData, assignedIndicators);
        console.log("🔍 Filtered form data for NODAL_OFFICER:", submissionData);
      }

      // Transform form data to NIRI format
      const niriSubmission = transformFormDataToNiriSubmission(
        submissionData,
        user?.id || '',
        user?.state || ''
      );
      
      console.log("🔍 NIRI Submission Data:", niriSubmission);
      
      // Validate NIRI submission
      const validation = validateNiriSubmission(niriSubmission);
      if (!validation.isValid) {
        console.error("❌ NIRI Validation Errors:", validation.errors);
        toast({
          title: "Validation Error",
          description: validation.errors.join(', '),
          variant: "destructive"
        });
        return;
      }
      
      // Submit to backend
      const response = await apiService.createSubmission(niriSubmission);
      
      toast({
        title: "Success",
        description: "Submission created successfully",
      });
      
      onSuccess?.(response);
    } catch (error: any) {
      console.error("❌ Submission Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create submission",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (sectionId: string, title: string, fields: string[]) => {
    // For NODAL_OFFICER, check if user has access to any field in this section
    if (isNodalOfficer && assignedIndicators.length > 0) {
      const fieldToIndicatorMap: Record<string, string> = {
        'capexToGsdpRatio': '1.1',
        'capexUtilization': '1.2',
        'creditRatedULBs': '1.3',
        'ulbsIssuingBonds': '1.4',
        'functionalFinancialIntermediary': '1.5',
        'infrastructureActPolicy': '2.1',
        'specializedEntity': '2.2',
        'sectorInfraPlan': '2.3',
        'investmentReadyPipeline': '2.4',
        'assetMonetizationPipeline': '2.5',
        'pppActPolicy': '3.1',
        'pppCell': '3.2',
        'vgfIipdfProposals': '3.3',
        'pppBankableProjects': '3.4',
        'pmgPortalEligible': '4.1',
        'statePmgPortal': '4.2',
        'pmGatiShaktiAdoption': '4.3',
        'adrAdoption': '4.4',
        'innovativePractices': '4.5',
        'capacityBuilding': '4.6'
      };

      // Check if any field in this section is assigned to user
      const hasAccessToSection = fields.some(field => {
        const indicator = fieldToIndicatorMap[field];
        return indicator && assignedIndicators.includes(indicator);
      });

      if (!hasAccessToSection) {
        return null; // Hide section completely
      }

      // Filter fields to only show assigned ones
      const accessibleFields = fields.filter(field => {
        const indicator = fieldToIndicatorMap[field];
        return indicator && assignedIndicators.includes(indicator);
      });

      return (
        <IndicatorSection sectionId={sectionId} title={title}>
          <div className="space-y-4">
            {accessibleFields.map(field => (
              <div key={field} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={field} className="text-sm font-medium">
                    {getFieldLabel(field)}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  {getFieldType(field) === 'select' ? (
                    <Select
                      value={formData[field] || ''}
                      onValueChange={(value) => handleInputChange(field, value)}
                    >
                      <SelectTrigger className={errors[field] ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field}
                      type="number"
                      value={formData[field] || ''}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      className={errors[field] ? 'border-red-500' : ''}
                      placeholder="Enter value"
                    />
                  )}
                  {errors[field] && (
                    <p className="text-sm text-red-500 mt-1">{errors[field]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </IndicatorSection>
      );
    }

    // For other roles, show all fields
    return (
      <IndicatorSection sectionId={sectionId} title={title}>
        <div className="space-y-4">
          {fields.map(field => (
            <div key={field} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={field} className="text-sm font-medium">
                  {getFieldLabel(field)}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                {getFieldType(field) === 'select' ? (
                  <Select
                    value={formData[field] || ''}
                    onValueChange={(value) => handleInputChange(field, value)}
                  >
                    <SelectTrigger className={errors[field] ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field}
                    type="number"
                    value={formData[field] || ''}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    className={errors[field] ? 'border-red-500' : ''}
                    placeholder="Enter value"
                  />
                )}
                {errors[field] && (
                  <p className="text-sm text-red-500 mt-1">{errors[field]}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </IndicatorSection>
    );
  };

  // Show loading state while checking indicator access
  if (indicatorLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">NIRI Data Submission</h1>
          <p className="text-muted-foreground mt-2">Loading your assigned indicators...</p>
        </div>
        <div className="flex justify-center">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Show error state if indicator access failed
  if (indicatorError) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">NIRI Data Submission</h1>
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {indicatorError}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Show no access message for NODAL_OFFICER with no assigned indicators
  if (isNodalOfficer && !hasAnyAccess()) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">NIRI Data Submission</h1>
          <Alert className="mt-4">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              आपको कोई भी indicator assign नहीं किया गया है। कृपया अपने administrator से संपर्क करें।
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">NIRI Data Submission</h1>
        <p className="text-muted-foreground mt-2">
          Submit your infrastructure readiness data in the standardized NIRI format
        </p>
        
        {/* Show assigned indicators for NODAL_OFFICER */}
        {isNodalOfficer && assignedIndicators.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Assigned Indicators:</strong> {assignedIndicators.join(', ')}
            </p>
          </div>
        )}
        
        {/* Prefill Button */}
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={handlePrefillData}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Load Sample Data
          </Button>
        </div>
      </div>

      {renderSection("infra-financing", "Infrastructure Financing", [
        'capexToGsdpRatio', 'capexUtilization', 'creditRatedULBs', 
        'ulbsIssuingBonds', 'functionalFinancialIntermediary'
      ])}

      {renderSection("infra-development", "Infrastructure Development", [
        'infrastructureActPolicy', 'specializedEntity', 'sectorInfraPlan',
        'investmentReadyPipeline', 'assetMonetizationPipeline'
      ])}

      {renderSection("ppp-development", "PPP Development", [
        'pppActPolicy', 'pppCell', 'vgfIipdfProposals', 'pppBankableProjects'
      ])}

      {renderSection("infra-enablers", "Infrastructure Enablers", [
        'pmgPortalEligible', 'statePmgPortal', 'pmGatiShaktiAdoption',
        'adrAdoption', 'innovativePractices', 'capacityBuilding'
      ])}

      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Data'}
        </Button>
      </div>
    </div>
  );
}

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    capexToGsdpRatio: '% of Capex to GSDP',
    capexUtilization: '% Capex Utilization',
    creditRatedULBs: '% of Credit Rated ULBs',
    ulbsIssuingBonds: '% of ULBs issuing Bonds',
    functionalFinancialIntermediary: 'Functional financial intermediary',
    infrastructureActPolicy: 'Infrastructure Act/Policy',
    specializedEntity: 'Specialized entity for infra dev',
    sectorInfraPlan: 'Sector Infra Development Plan',
    investmentReadyPipeline: 'Investment Ready project pipeline',
    assetMonetizationPipeline: 'Asset Monetization pipeline',
    pppActPolicy: 'PPP Act/Policy',
    pppCell: 'PPP Cell/Unit',
    vgfIipdfProposals: 'VGF/IIPDF Proposals',
    pppBankableProjects: 'PPP Bankable projects',
    pmgPortalEligible: 'Projects on PMG portal',
    statePmgPortal: 'State PMG portal',
    pmGatiShaktiAdoption: 'PM GatiShakti NMP',
    adrAdoption: 'ADR Adoption',
    innovativePractices: 'Innovative Practices',
    capacityBuilding: 'Capacity building participation'
  };
  
  return labels[field] || field;
}

function getFieldType(field: string): 'number' | 'select' {
  const selectFields = [
    'functionalFinancialIntermediary', 'infrastructureActPolicy', 'specializedEntity',
    'investmentReadyPipeline', 'assetMonetizationPipeline', 'pppActPolicy', 'pppCell',
    'pmgPortalEligible', 'statePmgPortal', 'adrAdoption'
  ];
  
  return selectFields.includes(field) ? 'select' : 'number';
}
