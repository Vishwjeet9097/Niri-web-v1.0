/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  transformFormDataToNiriSubmission,
  transformFormDataToSectionSubmission,
  validateNiriSubmission,
  transformNiriSubmissionToFormData,
} from "@/utils/submissionTransformer";
import { apiService } from "@/services/api.service";
import { authService } from "@/services/auth.service";
import { useToast } from "@/hooks/use-toast";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { IndicatorSection } from "@/components/IndicatorSection";
import {
  filterFormDataByIndicators,
  validateFormDataAccess,
} from "@/utils/indicatorUtils";
import { Download, RefreshCw, AlertTriangle, Lock } from "lucide-react";
import { appendFilesRecursively } from "@/utils/appendFilesRecursively";
// Import all indicator components (same as your previous file)
import { Section1_1_CapexToGSDP } from "@/components/IndicatorSections/Section1_1_CapexToGSDP";
import { Section1_2_CapexUtilization } from "@/components/IndicatorSections/Section1_2_CapexUtilization";
import { Section1_3_CreditRatedULBs } from "@/components/IndicatorSections/Section1_3_CreditRatedULBs";
import { Section1_4_ULBsIssuingBonds } from "@/components/IndicatorSections/Section1_4_ULBsIssuingBonds";
import { Section1_5_FunctionalFinancialIntermediary } from "@/components/IndicatorSections/Section1_5_FunctionalFinancialIntermediary";
import { Section2_1_InfrastructureActPolicy } from "@/components/IndicatorSections/Section2_1_InfrastructureActPolicy";
import { Section2_2_SpecializedEntity } from "@/components/IndicatorSections/Section2_2_SpecializedEntity";
import { Section2_3_SectorInfraPlan } from "@/components/IndicatorSections/Section2_3_SectorInfraPlan";
import { Section2_4_InvestmentReadyPipeline } from "@/components/IndicatorSections/Section2_4_InvestmentReadyPipeline";
import { Section2_5_AssetMonetizationPipeline } from "@/components/IndicatorSections/Section2_5_AssetMonetizationPipeline";
import { Section3_1_PPPActPolicy } from "@/components/IndicatorSections/Section3_1_PPPActPolicy";
import { Section3_2_FunctionalPPPCell } from "@/components/IndicatorSections/Section3_2_FunctionalPPPCell";
import { Section3_3_VGFIIPDFProposals } from "@/components/IndicatorSections/Section3_3_VGFIIPDFProposals";
import { Section3_4_PPPBankableProjects } from "@/components/IndicatorSections/Section3_4_PPPBankableProjects";
import { Section4_1_PMGPortalEligible } from "@/components/IndicatorSections/Section4_1_PMGPortalEligible";
import { Section4_2_StatePMGPortal } from "@/components/IndicatorSections/Section4_2_StatePMGPortal";
import { Section4_3_PMGatiShaktiAdoption } from "@/components/IndicatorSections/Section4_3_PMGatiShaktiAdoption";
import { Section4_4_ADRAdoption } from "@/components/IndicatorSections/Section4_4_ADRAdoption";
import { Section4_5_InnovativePractices } from "@/components/IndicatorSections/Section4_5_InnovativePractices";
import { Section4_6_CapacityBuilding } from "@/components/IndicatorSections/Section4_6_CapacityBuilding";

interface NiriSubmissionFormProps {
  onSuccess?: (submission: any) => void;
  onCancel?: () => void;
}

// field -> indicator code map (used for both NODAL and STATE logic)
const fieldToIndicatorMap: Record<string, string> = {
  capexToGsdpRatio: "1.1",
  capexUtilization: "1.2",
  creditRatedULBs: "1.3",
  ulbsIssuingBonds: "1.4",
  functionalFinancialIntermediary: "1.5",
  infrastructureActPolicy: "2.1",
  specializedEntity: "2.2",
  sectorInfraPlan: "2.3",
  investmentReadyPipeline: "2.4",
  assetMonetizationPipeline: "2.5",
  pppActPolicy: "3.1",
  pppCell: "3.2",
  vgfIipdfProposals: "3.3",
  pppBankableProjects: "3.4",
  pmgPortalEligible: "4.1",
  statePmgPortal: "4.2",
  pmGatiShaktiAdoption: "4.3",
  adrAdoption: "4.4",
  innovativePractices: "4.5",
  capacityBuilding: "4.6",
};

export function NiriSubmissionForm({ onSuccess, onCancel }: NiriSubmissionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Use the updated hook (availableIndicators + refresh)
  const {
    loading: indicatorLoading,
    error: indicatorError,
    assignedIndicators,
    availableIndicators,
    isNodalOfficer,
    isStateApprover,
    hasAnyAccess,
    getFirstAvailableSection,
    refresh,
  } = useIndicatorAccess();

  // Initialize form with default values (keeps same keys as before)
  useEffect(() => {
    const defaultValues = {
      // Infrastructure Financing
      capexToGsdpRatio: "",
      capexUtilization: "",
      creditRatedULBs: "",
      ulbsIssuingBonds: "",
      functionalFinancialIntermediary: "",

      // Infrastructure Development
      infrastructureActPolicy: "",
      specializedEntity: "",
      sectorInfraPlan: "",
      investmentReadyPipeline: "",
      assetMonetizationPipeline: "",

      // PPP Development
      pppActPolicy: "",
      pppCell: "",
      vgfIipdfProposals: "",
      pppBankableProjects: "",

      // Infrastructure Enablers
      pmgPortalEligible: "",
      statePmgPortal: "",
      pmGatiShaktiAdoption: "",
      adrAdoption: "",
      innovativePractices: "",
      capacityBuilding: "",
    };

    setFormData((prev) => {
      // keep existing values if present (avoid overwriting)
      if (Object.keys(prev).length === 0) return defaultValues;
      return { ...defaultValues, ...prev };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    // existing validation logic can be used; for now, keep minimal
    setErrors({});
    return true;
  };

  const handlePrefillData = () => {
    toast({
      title: "Prefill Data",
      description: "Prefill functionality will be implemented with actual API data",
      variant: "default",
    });
  };

  // Submission — filter based on assigned/available indicators provided by hook
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Debug logs: role, both indicator lists, and form fields
      console.group("🧩 Indicator Filtering Debug");
      console.log("User:", { id: user?._id || user?.id, role: user?.role });
      console.log("isNodalOfficer:", isNodalOfficer, "isStateApprover:", isStateApprover);
      console.log("Assigned Indicators (nodal):", assignedIndicators);
      console.log("Available Indicators (approver - unassigned):", availableIndicators);
      console.log("Form fields before filter:", Object.keys(formData));
      console.groupEnd();

      // Decide which indicator set to use for filtering
      let submissionFormData = formData;

      if (isNodalOfficer && assignedIndicators.length > 0) {
        submissionFormData = filterFormDataByIndicators(formData, assignedIndicators);
      } else if (isStateApprover && availableIndicators.length > 0) {
        submissionFormData = filterFormDataByIndicators(formData, availableIndicators);
      } else {
        // other roles: keep everything
        submissionFormData = formData;
      }

      const keptFields = Object.keys(submissionFormData);
      const removedFields = Object.keys(formData).filter((f) => !keptFields.includes(f));

      console.group("🛠️ Filter Result Debug");
      console.log("Kept fields:", keptFields);
      console.log("Removed fields (filtered out):", removedFields);
      console.groupEnd();

      // transform + validate
      const niriSubmission = transformFormDataToSectionSubmission(
        submissionFormData,
        user?.id || "",
        user?.state || ""
      );

      const validation = validateNiriSubmission(niriSubmission);
      if (!validation.isValid) {
        console.error("❌ NIRI Validation Errors:", validation.errors);
        toast({
          title: "Validation Error",
          description: validation.errors.join(", "),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const formDataObj = new FormData();
      formDataObj.append("submission", JSON.stringify(niriSubmission));

      appendFilesRecursively(formDataObj, submissionFormData);

      console.group("🧾 Final FormData to be sent:");
      for (const [key, value] of formDataObj.entries()) {
        console.log(key, value instanceof File ? value.name : value);
      }
      console.groupEnd();

      const response = await apiService.postMultipart("/submission", formDataObj);

      console.log("✅ Submission response:", response);
      toast({ title: "Success", description: "Submission created successfully" });
      if (onSuccess) onSuccess(response);
    } catch (error: any) {
      console.error("❌ Submission failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create submission",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to compute accessibleFields per section for STATE_APPROVER using availableIndicators
  const computeAccessibleFieldsForApprover = (fields: string[]) => {
    return fields.filter((field) => {
      const indicator = fieldToIndicatorMap[field];
      return indicator && availableIndicators.includes(indicator);
    });
  };

  // Render section — updated so STATE_APPROVER uses availableIndicators to determine visible fields
  const renderSection = (sectionId: string, title: string, fields: string[]) => {
    if (indicatorLoading) {
      return (
        <IndicatorSection sectionId={sectionId} title={title}>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your indicators...</p>
            </div>
          </div>
        </IndicatorSection>
      );
    }

    if (indicatorError) {
      return (
        <IndicatorSection sectionId={sectionId} title={title}>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">Error loading indicators: {indicatorError}</p>
          </div>
        </IndicatorSection>
      );
    }

    // STATE_APPROVER flow: use availableIndicators to pick fields
    if (isStateApprover) {
      const accessibleFields = computeAccessibleFieldsForApprover(fields);
      if (accessibleFields.length === 0) return null;

      return (
        <IndicatorSection sectionId={sectionId} title={title}>
          <div className="space-y-4">
            {sectionId === "infra-financing" && (
              <>
                {accessibleFields.includes("capexToGsdpRatio") && (
                  <Section1_1_CapexToGSDP
                    value={formData.capexToGsdpRatio}
                    onChange={(value) => handleInputChange("capexToGsdpRatio", value)}
                    error={errors.capexToGsdpRatio}
                  />
                )}
                {accessibleFields.includes("capexUtilization") && (
                  <Section1_2_CapexUtilization
                    value={formData.capexUtilization}
                    onChange={(value) => handleInputChange("capexUtilization", value)}
                    error={errors.capexUtilization}
                  />
                )}
                {accessibleFields.includes("creditRatedULBs") && (
                  <Section1_3_CreditRatedULBs
                    value={formData.creditRatedULBs}
                    onChange={(value) => handleInputChange("creditRatedULBs", value)}
                    error={errors.creditRatedULBs}
                  />
                )}
                {accessibleFields.includes("ulbsIssuingBonds") && (
                  <Section1_4_ULBsIssuingBonds
                    value={formData.ulbsIssuingBonds}
                    onChange={(value) => handleInputChange("ulbsIssuingBonds", value)}
                    error={errors.ulbsIssuingBonds}
                  />
                )}
                {accessibleFields.includes("functionalFinancialIntermediary") && (
                  <Section1_5_FunctionalFinancialIntermediary
                    value={formData.functionalFinancialIntermediary}
                    onChange={(value) => handleInputChange("functionalFinancialIntermediary", value)}
                    error={errors.functionalFinancialIntermediary}
                  />
                )}
              </>
            )}

            {sectionId === "infra-development" && (
              <>
                {accessibleFields.includes("infrastructureActPolicy") && (
                  <Section2_1_InfrastructureActPolicy
                    value={formData.infrastructureActPolicy}
                    onChange={(value) => handleInputChange("infrastructureActPolicy", value)}
                    error={errors.infrastructureActPolicy}
                  />
                )}
                {accessibleFields.includes("specializedEntity") && (
                  <Section2_2_SpecializedEntity
                    value={formData.specializedEntity}
                    onChange={(value) => handleInputChange("specializedEntity", value)}
                    error={errors.specializedEntity}
                  />
                )}
                {accessibleFields.includes("sectorInfraPlan") && (
                  <Section2_3_SectorInfraPlan
                    value={formData.sectorInfraPlan}
                    onChange={(value) => handleInputChange("sectorInfraPlan", value)}
                    error={errors.sectorInfraPlan}
                  />
                )}
                {accessibleFields.includes("investmentReadyPipeline") && (
                  <Section2_4_InvestmentReadyPipeline
                    value={formData.investmentReadyPipeline}
                    onChange={(value) => handleInputChange("investmentReadyPipeline", value)}
                    error={errors.investmentReadyPipeline}
                  />
                )}
                {accessibleFields.includes("assetMonetizationPipeline") && (
                  <Section2_5_AssetMonetizationPipeline
                    value={formData.assetMonetizationPipeline}
                    onChange={(value) => handleInputChange("assetMonetizationPipeline", value)}
                    error={errors.assetMonetizationPipeline}
                  />
                )}
              </>
            )}

            {sectionId === "ppp-development" && (
              <>
                {accessibleFields.includes("pppActPolicy") && (
                  <Section3_1_PPPActPolicy
                    value={formData.pppActPolicy}
                    onChange={(value) => handleInputChange("pppActPolicy", value)}
                    error={errors.pppActPolicy}
                  />
                )}
                {accessibleFields.includes("pppCell") && (
                  <Section3_2_FunctionalPPPCell
                    value={formData.pppCell}
                    onChange={(value) => handleInputChange("pppCell", value)}
                    error={errors.pppCell}
                  />
                )}
                {accessibleFields.includes("vgfIipdfProposals") && (
                  <Section3_3_VGFIIPDFProposals
                    value={formData.vgfIipdfProposals}
                    onChange={(value) => handleInputChange("vgfIipdfProposals", value)}
                    error={errors.vgfIipdfProposals}
                  />
                )}
                {accessibleFields.includes("pppBankableProjects") && (
                  <Section3_4_PPPBankableProjects
                    value={formData.pppBankableProjects}
                    onChange={(value) => handleInputChange("pppBankableProjects", value)}
                    error={errors.pppBankableProjects}
                  />
                )}
              </>
            )}

            {sectionId === "infra-enablers" && (
              <>
                {accessibleFields.includes("pmgPortalEligible") && (
                  <Section4_1_PMGPortalEligible
                    value={formData.pmgPortalEligible}
                    onChange={(value) => handleInputChange("pmgPortalEligible", value)}
                    error={errors.pmgPortalEligible}
                  />
                )}
                {accessibleFields.includes("statePmgPortal") && (
                  <Section4_2_StatePMGPortal
                    value={formData.statePmgPortal}
                    onChange={(value) => handleInputChange("statePmgPortal", value)}
                    error={errors.statePmgPortal}
                  />
                )}
                {accessibleFields.includes("pmGatiShaktiAdoption") && (
                  <Section4_3_PMGatiShaktiAdoption
                    value={formData.pmGatiShaktiAdoption}
                    onChange={(value) => handleInputChange("pmGatiShaktiAdoption", value)}
                    error={errors.pmGatiShaktiAdoption}
                  />
                )}
                {accessibleFields.includes("adrAdoption") && (
                  <Section4_4_ADRAdoption
                    value={formData.adrAdoption}
                    onChange={(value) => handleInputChange("adrAdoption", value)}
                    error={errors.adrAdoption}
                  />
                )}
                {accessibleFields.includes("innovativePractices") && (
                  <Section4_5_InnovativePractices
                    value={formData.innovativePractices}
                    onChange={(value) => handleInputChange("innovativePractices", value)}
                    error={errors.innovativePractices}
                  />
                )}
                {accessibleFields.includes("capacityBuilding") && (
                  <Section4_6_CapacityBuilding
                    value={formData.capacityBuilding}
                    onChange={(value) => handleInputChange("capacityBuilding", value)}
                    error={errors.capacityBuilding}
                  />
                )}
              </>
            )}
          </div>
        </IndicatorSection>
      );
    }

    // NODAL_OFFICER and other roles (existing behavior)
    if (isNodalOfficer) {
      // Use assignedIndicators to compute accessible fields
      if (!hasAnyAccess()) {
        return null;
      }

      const accessibleFields = fields.filter((field) => {
        const indicator = fieldToIndicatorMap[field];
        return indicator && assignedIndicators.includes(indicator);
      });

      if (accessibleFields.length === 0) return null;

      return (
        <IndicatorSection sectionId={sectionId} title={title}>
          <div className="space-y-4">
            {sectionId === "infra-financing" && (
              <>
                {accessibleFields.includes("capexToGsdpRatio") && (
                  <Section1_1_CapexToGSDP
                    value={formData.capexToGsdpRatio}
                    onChange={(value) => handleInputChange("capexToGsdpRatio", value)}
                    error={errors.capexToGsdpRatio}
                  />
                )}
                {accessibleFields.includes("capexUtilization") && (
                  <Section1_2_CapexUtilization
                    value={formData.capexUtilization}
                    onChange={(value) => handleInputChange("capexUtilization", value)}
                    error={errors.capexUtilization}
                  />
                )}
                {accessibleFields.includes("creditRatedULBs") && (
                  <Section1_3_CreditRatedULBs
                    value={formData.creditRatedULBs}
                    onChange={(value) => handleInputChange("creditRatedULBs", value)}
                    error={errors.creditRatedULBs}
                  />
                )}
                {accessibleFields.includes("ulbsIssuingBonds") && (
                  <Section1_4_ULBsIssuingBonds
                    value={formData.ulbsIssuingBonds}
                    onChange={(value) => handleInputChange("ulbsIssuingBonds", value)}
                    error={errors.ulbsIssuingBonds}
                  />
                )}
                {accessibleFields.includes("functionalFinancialIntermediary") && (
                  <Section1_5_FunctionalFinancialIntermediary
                    value={formData.functionalFinancialIntermediary}
                    onChange={(value) => handleInputChange("functionalFinancialIntermediary", value)}
                    error={errors.functionalFinancialIntermediary}
                  />
                )}
              </>
            )}
            {/* other sections same as above but only rendering accessibleFields */}
            {sectionId === "infra-development" && (
              <>
                {accessibleFields.includes("infrastructureActPolicy") && (
                  <Section2_1_InfrastructureActPolicy
                    value={formData.infrastructureActPolicy}
                    onChange={(value) => handleInputChange("infrastructureActPolicy", value)}
                    error={errors.infrastructureActPolicy}
                  />
                )}
                {accessibleFields.includes("specializedEntity") && (
                  <Section2_2_SpecializedEntity
                    value={formData.specializedEntity}
                    onChange={(value) => handleInputChange("specializedEntity", value)}
                    error={errors.specializedEntity}
                  />
                )}
                {accessibleFields.includes("sectorInfraPlan") && (
                  <Section2_3_SectorInfraPlan
                    value={formData.sectorInfraPlan}
                    onChange={(value) => handleInputChange("sectorInfraPlan", value)}
                    error={errors.sectorInfraPlan}
                  />
                )}
                {accessibleFields.includes("investmentReadyPipeline") && (
                  <Section2_4_InvestmentReadyPipeline
                    value={formData.investmentReadyPipeline}
                    onChange={(value) => handleInputChange("investmentReadyPipeline", value)}
                    error={errors.investmentReadyPipeline}
                  />
                )}
                {accessibleFields.includes("assetMonetizationPipeline") && (
                  <Section2_5_AssetMonetizationPipeline
                    value={formData.assetMonetizationPipeline}
                    onChange={(value) => handleInputChange("assetMonetizationPipeline", value)}
                    error={errors.assetMonetizationPipeline}
                  />
                )}
              </>
            )}

            {sectionId === "ppp-development" && (
              <>
                {accessibleFields.includes("pppActPolicy") && (
                  <Section3_1_PPPActPolicy
                    value={formData.pppActPolicy}
                    onChange={(value) => handleInputChange("pppActPolicy", value)}
                    error={errors.pppActPolicy}
                  />
                )}
                {accessibleFields.includes("pppCell") && (
                  <Section3_2_FunctionalPPPCell
                    value={formData.pppCell}
                    onChange={(value) => handleInputChange("pppCell", value)}
                    error={errors.pppCell}
                  />
                )}
                {accessibleFields.includes("vgfIipdfProposals") && (
                  <Section3_3_VGFIIPDFProposals
                    value={formData.vgfIipdfProposals}
                    onChange={(value) => handleInputChange("vgfIipdfProposals", value)}
                    error={errors.vgfIipdfProposals}
                  />
                )}
                {accessibleFields.includes("pppBankableProjects") && (
                  <Section3_4_PPPBankableProjects
                    value={formData.pppBankableProjects}
                    onChange={(value) => handleInputChange("pppBankableProjects", value)}
                    error={errors.pppBankableProjects}
                  />
                )}
              </>
            )}

            {sectionId === "infra-enablers" && (
              <>
                {accessibleFields.includes("pmgPortalEligible") && (
                  <Section4_1_PMGPortalEligible
                    value={formData.pmgPortalEligible}
                    onChange={(value) => handleInputChange("pmgPortalEligible", value)}
                    error={errors.pmgPortalEligible}
                  />
                )}
                {accessibleFields.includes("statePmgPortal") && (
                  <Section4_2_StatePMGPortal
                    value={formData.statePmgPortal}
                    onChange={(value) => handleInputChange("statePmgPortal", value)}
                    error={errors.statePmgPortal}
                  />
                )}
                {accessibleFields.includes("pmGatiShaktiAdoption") && (
                  <Section4_3_PMGatiShaktiAdoption
                    value={formData.pmGatiShaktiAdoption}
                    onChange={(value) => handleInputChange("pmGatiShaktiAdoption", value)}
                    error={errors.pmGatiShaktiAdoption}
                  />
                )}
                {accessibleFields.includes("adrAdoption") && (
                  <Section4_4_ADRAdoption
                    value={formData.adrAdoption}
                    onChange={(value) => handleInputChange("adrAdoption", value)}
                    error={errors.adrAdoption}
                  />
                )}
                {accessibleFields.includes("innovativePractices") && (
                  <Section4_5_InnovativePractices
                    value={formData.innovativePractices}
                    onChange={(value) => handleInputChange("innovativePractices", value)}
                    error={errors.innovativePractices}
                  />
                )}
                {accessibleFields.includes("capacityBuilding") && (
                  <Section4_6_CapacityBuilding
                    value={formData.capacityBuilding}
                    onChange={(value) => handleInputChange("capacityBuilding", value)}
                    error={errors.capacityBuilding}
                  />
                )}
              </>
            )}
          </div>
        </IndicatorSection>
      );
    }

    // default for other roles: show everything
    return (
      <IndicatorSection sectionId={sectionId} title={title}>
        <div className="space-y-4">
          {/* Infra Financing */}
          <Section1_1_CapexToGSDP
            value={formData.capexToGsdpRatio}
            onChange={(value) => handleInputChange("capexToGsdpRatio", value)}
            error={errors.capexToGsdpRatio}
          />
          <Section1_2_CapexUtilization
            value={formData.capexUtilization}
            onChange={(value) => handleInputChange("capexUtilization", value)}
            error={errors.capexUtilization}
          />
          <Section1_3_CreditRatedULBs
            value={formData.creditRatedULBs}
            onChange={(value) => handleInputChange("creditRatedULBs", value)}
            error={errors.creditRatedULBs}
          />
          <Section1_4_ULBsIssuingBonds
            value={formData.ulbsIssuingBonds}
            onChange={(value) => handleInputChange("ulbsIssuingBonds", value)}
            error={errors.ulbsIssuingBonds}
          />
          <Section1_5_FunctionalFinancialIntermediary
            value={formData.functionalFinancialIntermediary}
            onChange={(value) => handleInputChange("functionalFinancialIntermediary", value)}
            error={errors.functionalFinancialIntermediary}
          />

          {/* Infra Development */}
          <Section2_1_InfrastructureActPolicy
            value={formData.infrastructureActPolicy}
            onChange={(value) => handleInputChange("infrastructureActPolicy", value)}
            error={errors.infrastructureActPolicy}
          />
          <Section2_2_SpecializedEntity
            value={formData.specializedEntity}
            onChange={(value) => handleInputChange("specializedEntity", value)}
            error={errors.specializedEntity}
          />
          <Section2_3_SectorInfraPlan
            value={formData.sectorInfraPlan}
            onChange={(value) => handleInputChange("sectorInfraPlan", value)}
            error={errors.sectorInfraPlan}
          />
          <Section2_4_InvestmentReadyPipeline
            value={formData.investmentReadyPipeline}
            onChange={(value) => handleInputChange("investmentReadyPipeline", value)}
            error={errors.investmentReadyPipeline}
          />
          <Section2_5_AssetMonetizationPipeline
            value={formData.assetMonetizationPipeline}
            onChange={(value) => handleInputChange("assetMonetizationPipeline", value)}
            error={errors.assetMonetizationPipeline}
          />

          {/* PPP Development */}
          <Section3_1_PPPActPolicy
            value={formData.pppActPolicy}
            onChange={(value) => handleInputChange("pppActPolicy", value)}
            error={errors.pppActPolicy}
          />
          <Section3_2_FunctionalPPPCell
            value={formData.pppCell}
            onChange={(value) => handleInputChange("pppCell", value)}
            error={errors.pppCell}
          />
          <Section3_3_VGFIIPDFProposals
            value={formData.vgfIipdfProposals}
            onChange={(value) => handleInputChange("vgfIipdfProposals", value)}
            error={errors.vgfIipdfProposals}
          />
          <Section3_4_PPPBankableProjects
            value={formData.pppBankableProjects}
            onChange={(value) => handleInputChange("pppBankableProjects", value)}
            error={errors.pppBankableProjects}
          />

          {/* Infra Enablers */}
          <Section4_1_PMGPortalEligible
            value={formData.pmgPortalEligible}
            onChange={(value) => handleInputChange("pmgPortalEligible", value)}
            error={errors.pmgPortalEligible}
          />
          <Section4_2_StatePMGPortal
            value={formData.statePmgPortal}
            onChange={(value) => handleInputChange("statePmgPortal", value)}
            error={errors.statePmgPortal}
          />
          <Section4_3_PMGatiShaktiAdoption
            value={formData.pmGatiShaktiAdoption}
            onChange={(value) => handleInputChange("pmGatiShaktiAdoption", value)}
            error={errors.pmGatiShaktiAdoption}
          />
          <Section4_4_ADRAdoption
            value={formData.adrAdoption}
            onChange={(value) => handleInputChange("adrAdoption", value)}
            error={errors.adrAdoption}
          />
          <Section4_5_InnovativePractices
            value={formData.innovativePractices}
            onChange={(value) => handleInputChange("innovativePractices", value)}
            error={errors.innovativePractices}
          />
          <Section4_6_CapacityBuilding
            value={formData.capacityBuilding}
            onChange={(value) => handleInputChange("capacityBuilding", value)}
            error={errors.capacityBuilding}
          />
        </div>
      </IndicatorSection>
    );
  };

  // Show loading state while indicator access is loading
  if (indicatorLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">NIRI Data Submission</h1>
          <p className="text-muted-foreground mt-2">Loading your assigned/available indicators...</p>
        </div>
        <div className="flex justify-center">
          <RefreshCw className="w-8 h-8 animate-spin" />
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
              <strong>Assigned Indicators:</strong> {assignedIndicators.join(", ")}
            </p>
          </div>
        )}

        {/* Show available indicators for STATE_APPROVER */}
        {isStateApprover && availableIndicators.length > 0 && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Available (unassigned) Indicators:</strong> {availableIndicators.join(", ")}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={handlePrefillData} className="gap-2">
            <Download className="w-4 h-4" />
            Load Sample Data
          </Button>

          {/* Refresh Indicators Button (uses hook refresh) */}
          <Button
            variant="outline"
            onClick={() => refresh({ clearCache: true })}
            className="gap-2"
            disabled={indicatorLoading}
          >
            <RefreshCw className={`w-4 h-4 ${indicatorLoading ? "animate-spin" : ""}`} />
            {indicatorLoading ? "Loading..." : "Refresh Indicators"}
          </Button>
        </div>
      </div>

      {renderSection("infra-financing", "Infrastructure Financing", [
        "capexToGsdpRatio",
        "capexUtilization",
        "creditRatedULBs",
        "ulbsIssuingBonds",
        "functionalFinancialIntermediary",
      ])}

      {renderSection("infra-development", "Infrastructure Development", [
        "infrastructureActPolicy",
        "specializedEntity",
        "sectorInfraPlan",
        "investmentReadyPipeline",
        "assetMonetizationPipeline",
      ])}

      {renderSection("ppp-development", "PPP Development", [
        "pppActPolicy",
        "pppCell",
        "vgfIipdfProposals",
        "pppBankableProjects",
      ])}

      {renderSection("infra-enablers", "Infrastructure Enablers", [
        "pmgPortalEligible",
        "statePmgPortal",
        "pmGatiShaktiAdoption",
        "adrAdoption",
        "innovativePractices",
        "capacityBuilding",
      ])}

      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Submitting..." : "Submit Data"}
        </Button>
      </div>
    </div>
  );
}
