import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/features/auth/AuthProvider';
import { transformFormDataToNiriSubmission, validateNiriSubmission, transformNiriSubmissionToFormData } from '@/utils/submissionTransformer';
import { apiService } from '@/services/api.service';
import { authService } from '@/services/auth.service';
import { useToast } from '@/hooks/use-toast';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';
import { IndicatorSection } from '@/components/IndicatorSection';
import { filterFormDataByIndicators, validateFormDataAccess } from '@/utils/indicatorUtils';
import { Download, RefreshCw, AlertTriangle, Lock } from 'lucide-react';

// Import all indicator components
import { Section1_1_CapexToGSDP } from '@/components/IndicatorSections/Section1_1_CapexToGSDP';
import { Section1_2_CapexUtilization } from '@/components/IndicatorSections/Section1_2_CapexUtilization';
import { Section1_3_CreditRatedULBs } from '@/components/IndicatorSections/Section1_3_CreditRatedULBs';
import { Section1_4_ULBsIssuingBonds } from '@/components/IndicatorSections/Section1_4_ULBsIssuingBonds';
import { Section1_5_FunctionalFinancialIntermediary } from '@/components/IndicatorSections/Section1_5_FunctionalFinancialIntermediary';
import { Section2_1_InfrastructureActPolicy } from '@/components/IndicatorSections/Section2_1_InfrastructureActPolicy';
import { Section2_2_SpecializedEntity } from '@/components/IndicatorSections/Section2_2_SpecializedEntity';
import { Section2_3_SectorInfraPlan } from '@/components/IndicatorSections/Section2_3_SectorInfraPlan';
import { Section2_4_InvestmentReadyPipeline } from '@/components/IndicatorSections/Section2_4_InvestmentReadyPipeline';
import { Section2_5_AssetMonetizationPipeline } from '@/components/IndicatorSections/Section2_5_AssetMonetizationPipeline';
import { Section3_1_PPPActPolicy } from '@/components/IndicatorSections/Section3_1_PPPActPolicy';
import { Section3_2_FunctionalPPPCell } from '@/components/IndicatorSections/Section3_2_FunctionalPPPCell';
import { Section3_3_VGFIIPDFProposals } from '@/components/IndicatorSections/Section3_3_VGFIIPDFProposals';
import { Section3_4_PPPBankableProjects } from '@/components/IndicatorSections/Section3_4_PPPBankableProjects';
import { Section4_1_PMGPortalEligible } from '@/components/IndicatorSections/Section4_1_PMGPortalEligible';
import { Section4_2_StatePMGPortal } from '@/components/IndicatorSections/Section4_2_StatePMGPortal';
import { Section4_3_PMGatiShaktiAdoption } from '@/components/IndicatorSections/Section4_3_PMGatiShaktiAdoption';
import { Section4_4_ADRAdoption } from '@/components/IndicatorSections/Section4_4_ADRAdoption';
import { Section4_5_InnovativePractices } from '@/components/IndicatorSections/Section4_5_InnovativePractices';
import { Section4_6_CapacityBuilding } from '@/components/IndicatorSections/Section4_6_CapacityBuilding';
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
  const [forceRefresh, setForceRefresh] = useState(0);
  
  // Indicator access control
  let indicatorLoading = false;
  let indicatorError = null;
  let assignedIndicators: string[] = [];
  let hasAnyAccess = () => true;
  let getFirstAvailableSection = () => "infra-financing";
  let isNodalOfficer = false;

  try {
    const indicatorAccess = useIndicatorAccess();
    indicatorLoading = indicatorAccess.loading;
    indicatorError = indicatorAccess.error;
    assignedIndicators = indicatorAccess.assignedIndicators;
    hasAnyAccess = indicatorAccess.hasAnyAccess;
    getFirstAvailableSection = indicatorAccess.getFirstAvailableSection;
    isNodalOfficer = indicatorAccess.isNodalOfficer;
    // Debug logging removed for performance

  } catch (error) {
    console.error("🔍 NiriSubmissionForm: useIndicatorAccess hook failed:", error);
  }

  // Immediate debug logging
    // Debug logging removed for performance

  // Force API call immediately for NODAL_OFFICER
  React.useEffect(() => {
    // Debug logging removed for performance

    if (user?.role === "NODAL_OFFICER") {
    // Debug logging removed for performance

      const makeApiCall = async () => {
        try {
          const userId = user?._id || user?.id;
    // Debug logging removed for performance

          if (userId) {
    // Debug logging removed for performance

            const indicators = await apiService.getUserAssignedIndicators(userId);
    // Debug logging removed for performance

            if (indicators && indicators.length > 0) {
              const updatedUser = { ...user, assignedIndicators: indicators };
              authService.setAuth(updatedUser, authService.getTokens());
    // Debug logging removed for performance

              setForceRefresh(prev => prev + 1);
            } else {
    // Debug logging removed for performance

            }
          } else {
    // Debug logging removed for performance

          }
        } catch (error) {
          console.error("🔍 NiriSubmissionForm: useEffect - API call failed:", error);
        }
      };
      
      makeApiCall();
    } else {
    // Debug logging removed for performance

    }
  }, [user?.role, user?._id, user?.id]); // Dependencies to ensure it runs when user changes

  // Force immediate API call for NODAL_OFFICER
  if (isNodalOfficer && assignedIndicators.length === 0) {
    // Debug logging removed for performance

    const immediateApiCall = async () => {
      try {
        const userId = user?._id || user?.id;
    // Debug logging removed for performance

        if (userId) {
          const indicators = await apiService.getUserAssignedIndicators(userId);
    // Debug logging removed for performance

          if (indicators.length > 0) {
            const updatedUser = { ...user, assignedIndicators: indicators };
            authService.setAuth(updatedUser, authService.getTokens());
    // Debug logging removed for performance

            setForceRefresh(prev => prev + 1); // Trigger re-render
          }
        }
      } catch (err) {
        console.error("🔍 NiriSubmissionForm: Immediate API call failed:", err);
      }
    };
    
    immediateApiCall();
  }

  // Force API call for NODAL_OFFICER regardless of hook state
    // Debug logging removed for performance

  if (user?.role === "NODAL_OFFICER") {
    // Debug logging removed for performance

    const forcedApiCall = async () => {
      try {
        const userId = user?._id || user?.id;
    // Debug logging removed for performance

    // Debug logging removed for performance

        if (userId) {
    // Debug logging removed for performance

          const indicators = await apiService.getUserAssignedIndicators(userId);
    // Debug logging removed for performance

          if (indicators.length > 0) {
            const updatedUser = { ...user, assignedIndicators: indicators };
            authService.setAuth(updatedUser, authService.getTokens());
    // Debug logging removed for performance

            setForceRefresh(prev => prev + 1); // Trigger re-render
          } else {
    // Debug logging removed for performance

          }
        } else {
    // Debug logging removed for performance

        }
      } catch (err) {
        console.error("🔍 NiriSubmissionForm: Forced API call failed:", err);
      }
    };
    
    forcedApiCall();
  } else {
    // Debug logging removed for performance

  }

  // Manual trigger for indicator fetch
  const triggerIndicatorFetch = useCallback(async () => {
    if (!isNodalOfficer) return;
    // Debug logging removed for performance

    try {
      const userId = user?._id || user?.id;
      if (userId) {
    // Debug logging removed for performance

        const indicators = await apiService.getUserAssignedIndicators(userId);
    // Debug logging removed for performance

        // Update user object with fresh indicators
        if (indicators.length > 0) {
          const updatedUser = {
            ...user,
            assignedIndicators: indicators,
          };
          authService.setAuth(updatedUser, authService.getTokens());
    // Debug logging removed for performance

          setForceRefresh(prev => prev + 1); // Trigger re-render
        }
      }
    } catch (err) {
      console.error("🔍 NiriSubmissionForm: Manual indicator fetch failed:", err);
    }
  }, [isNodalOfficer, user]);

  // Force refresh indicators when component mounts
  useEffect(() => {
    // Debug logging removed for performance

    // Force trigger indicator fetch if user is NODAL_OFFICER and no indicators loaded
    if (isNodalOfficer && !indicatorLoading && assignedIndicators.length === 0 && !indicatorError) {
    // Debug logging removed for performance

      triggerIndicatorFetch();
    }
  }, [isNodalOfficer, assignedIndicators, indicatorLoading, indicatorError, forceRefresh, triggerIndicatorFetch]);

  // Additional useEffect to ensure API call happens on every page visit
  useEffect(() => {
    // Debug logging removed for performance

    // Force API call if user is NODAL_OFFICER
    if (isNodalOfficer) {
    // Debug logging removed for performance

      triggerIndicatorFetch();
    }
  }, []); // Run only once when component mounts

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
    // Debug logging removed for performance

      }

      // Transform form data to NIRI format
      const niriSubmission = transformFormDataToNiriSubmission(
        submissionData,
        user?.id || '',
        user?.state || ''
      );
    // Debug logging removed for performance

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
    // Debug logging removed for performance

    // For NODAL_OFFICER, check if user has access to any field in this section
    if (isNodalOfficer) {
      // If still loading indicators, show loading state
      if (indicatorLoading) {
        return (
          <IndicatorSection sectionId={sectionId} title={title}>
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your assigned indicators...</p>
              </div>
            </div>
          </IndicatorSection>
        );
      }

      // If error loading indicators, show error
      if (indicatorError) {
        return (
          <IndicatorSection sectionId={sectionId} title={title}>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">Error loading indicators: {indicatorError}</p>
            </div>
          </IndicatorSection>
        );
      }

      // If no indicators assigned, hide section
      if (assignedIndicators.length === 0) {
    // Debug logging removed for performance

        return null;
      }

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
        const hasAccess = indicator && assignedIndicators.includes(indicator);
    // Debug logging removed for performance

        return hasAccess;
      });
    // Debug logging removed for performance

      if (!hasAccessToSection) {
    // Debug logging removed for performance

        return null; // Hide section completely
      }

      // Filter fields to only show assigned ones
      const accessibleFields = fields.filter(field => {
        const indicator = fieldToIndicatorMap[field];
        const hasAccess = indicator && assignedIndicators.includes(indicator);
    // Debug logging removed for performance

        return hasAccess;
      });
    // Debug logging removed for performance

      return (
        <IndicatorSection sectionId={sectionId} title={title}>
          <div className="space-y-4">
            {/* Section 1: Infrastructure Financing */}
            {sectionId === 'infra-financing' && (
              <>
                {accessibleFields.includes('capexToGsdpRatio') && (
                  <Section1_1_CapexToGSDP
                    value={typeof formData.capexToGsdpRatio === 'number' ? formData.capexToGsdpRatio : undefined}
                    onChange={(value) => handleInputChange('capexToGsdpRatio', value)}
                    error={errors.capexToGsdpRatio}
                  />
                )}
                {accessibleFields.includes('capexUtilization') && (
                  <Section1_2_CapexUtilization
                    value={typeof formData.capexUtilization === 'number' ? formData.capexUtilization : undefined}
                    onChange={(value) => handleInputChange('capexUtilization', value)}
                    error={errors.capexUtilization}
                  />
                )}
                {accessibleFields.includes('creditRatedULBs') && (
                  <Section1_3_CreditRatedULBs
                    value={typeof formData.creditRatedULBs === 'number' ? formData.creditRatedULBs : undefined}
                    onChange={(value) => handleInputChange('creditRatedULBs', value)}
                    error={errors.creditRatedULBs}
                  />
                )}
                {accessibleFields.includes('ulbsIssuingBonds') && (
                  <Section1_4_ULBsIssuingBonds
                    value={typeof formData.ulbsIssuingBonds === 'number' ? formData.ulbsIssuingBonds : undefined}
                    onChange={(value) => handleInputChange('ulbsIssuingBonds', value)}
                    error={errors.ulbsIssuingBonds}
                  />
                )}
                {accessibleFields.includes('functionalFinancialIntermediary') && (
                  <Section1_5_FunctionalFinancialIntermediary
                    value={typeof formData.functionalFinancialIntermediary === 'number' ? formData.functionalFinancialIntermediary : undefined}
                    onChange={(value) => handleInputChange('functionalFinancialIntermediary', value)}
                    error={errors.functionalFinancialIntermediary}
                  />
                )}
              </>
            )}

            {/* Section 2: Infrastructure Development */}
            {sectionId === 'infra-development' && (
              <>
                {accessibleFields.includes('infrastructureActPolicy') && (
                  <Section2_1_InfrastructureActPolicy
                    value={formData.infrastructureActPolicy}
                    onChange={(value) => handleInputChange('infrastructureActPolicy', value)}
                    error={errors.infrastructureActPolicy}
                  />
                )}
                {accessibleFields.includes('specializedEntity') && (
                  <Section2_2_SpecializedEntity
                    value={typeof formData.specializedEntity === 'number' ? formData.specializedEntity : undefined}
                    onChange={(value) => handleInputChange('specializedEntity', value)}
                    error={errors.specializedEntity}
                  />
                )}
                {accessibleFields.includes('sectorInfraPlan') && (
                  <Section2_3_SectorInfraPlan
                    value={formData.sectorInfraPlan}
                    onChange={(value) => handleInputChange('sectorInfraPlan', value)}
                    error={errors.sectorInfraPlan}
                  />
                )}
                {accessibleFields.includes('investmentReadyPipeline') && (
                  <Section2_4_InvestmentReadyPipeline
                    value={typeof formData.investmentReadyPipeline === 'number' ? formData.investmentReadyPipeline : undefined}
                    onChange={(value) => handleInputChange('investmentReadyPipeline', value)}
                    error={errors.investmentReadyPipeline}
                  />
                )}
                {accessibleFields.includes('assetMonetizationPipeline') && (
                  <Section2_5_AssetMonetizationPipeline
                    value={typeof formData.assetMonetizationPipeline === 'number' ? formData.assetMonetizationPipeline : undefined}
                    onChange={(value) => handleInputChange('assetMonetizationPipeline', value)}
                    error={errors.assetMonetizationPipeline}
                  />
                )}
              </>
            )}

            {/* Section 3: PPP Development */}
            {sectionId === 'ppp-development' && (
              <>
                {accessibleFields.includes('pppActPolicy') && (
                  <Section3_1_PPPActPolicy
                    value={formData.pppActPolicy}
                    onChange={(value) => handleInputChange('pppActPolicy', value)}
                    error={errors.pppActPolicy}
                  />
                )}
                {accessibleFields.includes('pppCell') && (
                  <Section3_2_FunctionalPPPCell
                    value={formData.pppCell}
                    onChange={(value) => handleInputChange('pppCell', value)}
                    error={errors.pppCell}
                  />
                )}
                {accessibleFields.includes('vgfIipdfProposals') && (
                  <Section3_3_VGFIIPDFProposals
                    value={typeof formData.vgfIipdfProposals === 'number' ? formData.vgfIipdfProposals : undefined}
                    onChange={(value) => handleInputChange('vgfIipdfProposals', value)}
                    error={errors.vgfIipdfProposals}
                  />
                )}
                {accessibleFields.includes('pppBankableProjects') && (
                  <Section3_4_PPPBankableProjects
                    value={typeof formData.pppBankableProjects === 'number' ? formData.pppBankableProjects : undefined}
                    onChange={(value) => handleInputChange('pppBankableProjects', value)}
                    error={errors.pppBankableProjects}
                  />
                )}
              </>
            )}

            {/* Section 4: Infrastructure Enablers */}
            {sectionId === 'infra-enablers' && (
              <>
                {accessibleFields.includes('pmgPortalEligible') && (
                  <Section4_1_PMGPortalEligible
                    value={formData.pmgPortalEligible}
                    onChange={(value) => handleInputChange('pmgPortalEligible', value)}
                    error={errors.pmgPortalEligible}
                  />
                )}
                {accessibleFields.includes('statePmgPortal') && (
                  <Section4_2_StatePMGPortal
                    value={formData.statePmgPortal}
                    onChange={(value) => handleInputChange('statePmgPortal', value)}
                    error={errors.statePmgPortal}
                  />
                )}
                {accessibleFields.includes('pmGatiShaktiAdoption') && (
                  <Section4_3_PMGatiShaktiAdoption
                    value={formData.pmGatiShaktiAdoption}
                    onChange={(value) => handleInputChange('pmGatiShaktiAdoption', value)}
                    error={errors.pmGatiShaktiAdoption}
                  />
                )}
                {accessibleFields.includes('adrAdoption') && (
                  <Section4_4_ADRAdoption
                    value={formData.adrAdoption}
                    onChange={(value) => handleInputChange('adrAdoption', value)}
                    error={errors.adrAdoption}
                  />
                )}
                {accessibleFields.includes('innovativePractices') && (
                  <Section4_5_InnovativePractices
                    value={typeof formData.innovativePractices === 'number' ? formData.innovativePractices : undefined}
                    onChange={(value) => handleInputChange('innovativePractices', value)}
                    error={errors.innovativePractices}
                  />
                )}
                {accessibleFields.includes('capacityBuilding') && (
                  <Section4_6_CapacityBuilding
                    value={typeof formData.capacityBuilding === 'number' ? formData.capacityBuilding : undefined}
                    onChange={(value) => handleInputChange('capacityBuilding', value)}
                    error={errors.capacityBuilding}
                  />
                )}
              </>
            )}
          </div>
        </IndicatorSection>
      );
    }

    // For other roles, show all fields using the same component structure
    return (
      <IndicatorSection sectionId={sectionId} title={title}>
        <div className="space-y-4">
          {/* Section 1: Infrastructure Financing */}
          {sectionId === 'infra-financing' && (
            <>
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
              <Section1_3_CreditRatedULBs
                value={typeof formData.creditRatedULBs === 'number' ? formData.creditRatedULBs : undefined}
                onChange={(value) => handleInputChange('creditRatedULBs', value)}
                error={errors.creditRatedULBs}
              />
              <Section1_4_ULBsIssuingBonds
                value={typeof formData.ulbsIssuingBonds === 'number' ? formData.ulbsIssuingBonds : undefined}
                onChange={(value) => handleInputChange('ulbsIssuingBonds', value)}
                error={errors.ulbsIssuingBonds}
              />
              <Section1_5_FunctionalFinancialIntermediary
                value={typeof formData.functionalFinancialIntermediary === 'number' ? formData.functionalFinancialIntermediary : undefined}
                onChange={(value) => handleInputChange('functionalFinancialIntermediary', value)}
                error={errors.functionalFinancialIntermediary}
              />
            </>
          )}

          {/* Section 2: Infrastructure Development */}
          {sectionId === 'infra-development' && (
            <>
              <Section2_1_InfrastructureActPolicy
                value={formData.infrastructureActPolicy}
                onChange={(value) => handleInputChange('infrastructureActPolicy', value)}
                error={errors.infrastructureActPolicy}
              />
              <Section2_2_SpecializedEntity
                value={typeof formData.specializedEntity === 'number' ? formData.specializedEntity : undefined}
                onChange={(value) => handleInputChange('specializedEntity', value)}
                error={errors.specializedEntity}
              />
              <Section2_3_SectorInfraPlan
                value={formData.sectorInfraPlan}
                onChange={(value) => handleInputChange('sectorInfraPlan', value)}
                error={errors.sectorInfraPlan}
              />
              <Section2_4_InvestmentReadyPipeline
                value={typeof formData.investmentReadyPipeline === 'number' ? formData.investmentReadyPipeline : undefined}
                onChange={(value) => handleInputChange('investmentReadyPipeline', value)}
                error={errors.investmentReadyPipeline}
              />
              <Section2_5_AssetMonetizationPipeline
                value={typeof formData.assetMonetizationPipeline === 'number' ? formData.assetMonetizationPipeline : undefined}
                onChange={(value) => handleInputChange('assetMonetizationPipeline', value)}
                error={errors.assetMonetizationPipeline}
              />
            </>
          )}

          {/* Section 3: PPP Development */}
          {sectionId === 'ppp-development' && (
            <>
              <Section3_1_PPPActPolicy
                value={formData.pppActPolicy}
                onChange={(value) => handleInputChange('pppActPolicy', value)}
                error={errors.pppActPolicy}
              />
              <Section3_2_FunctionalPPPCell
                value={formData.pppCell}
                onChange={(value) => handleInputChange('pppCell', value)}
                error={errors.pppCell}
              />
              <Section3_3_VGFIIPDFProposals
                value={typeof formData.vgfIipdfProposals === 'number' ? formData.vgfIipdfProposals : undefined}
                onChange={(value) => handleInputChange('vgfIipdfProposals', value)}
                error={errors.vgfIipdfProposals}
              />
              <Section3_4_PPPBankableProjects
                value={typeof formData.pppBankableProjects === 'number' ? formData.pppBankableProjects : undefined}
                onChange={(value) => handleInputChange('pppBankableProjects', value)}
                error={errors.pppBankableProjects}
              />
            </>
          )}

          {/* Section 4: Infrastructure Enablers */}
          {sectionId === 'infra-enablers' && (
            <>
              <Section4_1_PMGPortalEligible
                value={formData.pmgPortalEligible}
                onChange={(value) => handleInputChange('pmgPortalEligible', value)}
                error={errors.pmgPortalEligible}
              />
              <Section4_2_StatePMGPortal
                value={formData.statePmgPortal}
                onChange={(value) => handleInputChange('statePmgPortal', value)}
                error={errors.statePmgPortal}
              />
              <Section4_3_PMGatiShaktiAdoption
                value={formData.pmGatiShaktiAdoption}
                onChange={(value) => handleInputChange('pmGatiShaktiAdoption', value)}
                error={errors.pmGatiShaktiAdoption}
              />
              <Section4_4_ADRAdoption
                value={formData.adrAdoption}
                onChange={(value) => handleInputChange('adrAdoption', value)}
                error={errors.adrAdoption}
              />
              <Section4_5_InnovativePractices
                value={typeof formData.innovativePractices === 'number' ? formData.innovativePractices : undefined}
                onChange={(value) => handleInputChange('innovativePractices', value)}
                error={errors.innovativePractices}
              />
              <Section4_6_CapacityBuilding
                value={typeof formData.capacityBuilding === 'number' ? formData.capacityBuilding : undefined}
                onChange={(value) => handleInputChange('capacityBuilding', value)}
                error={errors.capacityBuilding}
              />
            </>
          )}
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
        
        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrefillData}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Load Sample Data
          </Button>
          
          {/* Refresh Indicators Button for NODAL_OFFICER */}
          {isNodalOfficer && (
            <Button
              variant="outline"
              onClick={triggerIndicatorFetch}
              className="gap-2"
              disabled={indicatorLoading}
            >
              <RefreshCw className={`w-4 h-4 ${indicatorLoading ? 'animate-spin' : ''}`} />
              {indicatorLoading ? 'Loading...' : 'Refresh Indicators'}
            </Button>
          )}
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
    'sectorInfraPlan', 'investmentReadyPipeline', 'assetMonetizationPipeline', 
    'pppActPolicy', 'pppCell', 'pmgPortalEligible', 'statePmgPortal', 
    'pmGatiShaktiAdoption', 'adrAdoption'
  ];
  
  return selectFields.includes(field) ? 'select' : 'number';
}
