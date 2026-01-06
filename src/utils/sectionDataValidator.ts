/**
 * Utility functions to validate if a section has meaningful data
 * Used for conditional rendering in review components
 */

export interface SectionData {
  [key: string]: any;
}

/**
 * Check if a value has meaningful data (not empty, null, undefined, or zero)
 */
const hasMeaningfulValue = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return value !== 0;
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    // Check if object has any meaningful properties
    return Object.values(value).some(hasMeaningfulValue);
  }
  return true;
};

/**
 * Check if a file object has meaningful data
 */
const hasFileData = (file: any): boolean => {
  if (!file) return false;
  if (Array.isArray(file)) {
    return file.some((entry) => hasFileData(entry));
  }
  if (typeof file !== "object") return false;
  return !!(file.fileName || file.file || file.id);
};

/**
 * Check if an array has meaningful data
 */
const hasArrayData = (arr: any[]): boolean => {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  return arr.some((item) => {
    if (typeof item === "object" && item !== null) {
      return Object.values(item).some(hasMeaningfulValue);
    }
    return hasMeaningfulValue(item);
  });
};

/**
 * Check if infra enablers section has data
 * Excludes SAVE_AS_DRAFT indicators from review (they should not be visible to STATE_APPROVER)
 */
export const hasInfraEnablersData = (formData: any): boolean => {
  if (!formData?.infraEnablers) return false;

  const { infraEnablers } = formData;

  // Check each section
  const sections = [
    "section4_1",
    "section4_2",
    "section4_3",
    "section4_4",
    "section4_5",
  ];

  return sections.some((sectionId) => {
    const section = infraEnablers[sectionId];
    if (!section) return false;
    
    // Exclude SAVE_AS_DRAFT indicators from review
    const status = section?.status?.toUpperCase();
    if (status === "SAVE_AS_DRAFT") {
      return false;
    }

    switch (sectionId) {
      case "section4_1":
        return (
          hasMeaningfulValue(section.available) ||
          hasMeaningfulValue(section.comment) ||
          hasFileData(section.file)
        );

      case "section4_2":
        // Check mandatory field: adopted (yes/no)
        if (section.adopted === "yes" || section.adopted === "no") {
          // If "yes", check for projects array
          if (section.adopted === "yes") {
            return hasArrayData(section.projects);
          }
          // If "no", check for comment (required)
          if (section.adopted === "no") {
            return hasMeaningfulValue(section.comment);
          }
        }
        // Fallback: check calculated fields (for backward compatibility)
        return (
          hasMeaningfulValue(section.marksObtained) ||
          hasMeaningfulValue(section.numberOfProjects)
        );

      case "section4_3":
        return (
          hasFileData(section.file) ||
          hasMeaningfulValue(section.adopted) ||
          hasMeaningfulValue(section.comment) ||
          hasMeaningfulValue(section.marksObtained)
        );

      case "section4_4":
        return (
          hasFileData(section.file) ||
          hasMeaningfulValue(section.impact) ||
          hasMeaningfulValue(section.implemented) ||
          hasMeaningfulValue(section.practiceName) ||
          hasArrayData(section.practices)
        );

      case "section4_5":
        // Check mandatory field: participated (yes/no)
        if (section.participated === "yes" || section.participated === "no") {
          // If "yes", check for capacityArray
          if (section.participated === "yes") {
            return hasArrayData(section.capacityArray);
          }
          // If "no", check for comment (required)
          if (section.participated === "no") {
            return hasMeaningfulValue(section.comment);
          }
        }
        // Fallback: check for capacityArray (for backward compatibility)
        return hasArrayData(section?.capacityArray);

      default:
        return false;
    }
  });
};

/**
 * Check if infra financing section has data
 * Excludes SAVE_AS_DRAFT indicators from review (they should not be visible to STATE_APPROVER)
 */
export const hasInfraFinancingData = (formData: any): boolean => {
  if (!formData?.infraFinancing) return false;

  const { infraFinancing } = formData;

  // Check each section
  const sections = [
    "section1_1",
    "section1_2",
    "section1_3",
    "section1_4",
    "section1_5",
  ];

  return sections.some((sectionId) => {
    const section = infraFinancing[sectionId];
    if (!section) return false;
    
    // Exclude SAVE_AS_DRAFT indicators from review
    const status = section?.status?.toUpperCase();
    if (status === "SAVE_AS_DRAFT") {
      return false;
    }

    switch (sectionId) {
      case "section1_1":
        // Exclude percentage and marksObtained from meaningful data check
        // These are calculated/backend fields and should not determine visibility
        return (
          // hasMeaningfulValue(section.year) ||
          hasMeaningfulValue(section.gsdpForFY) ||
          hasMeaningfulValue(section.allocationToGSDP) ||
          hasMeaningfulValue(section.capitalAllocation) ||
          hasMeaningfulValue(section.capexToCapexActuals) ||
          hasMeaningfulValue(section.stateCapexUtilisation)
        );

      case "section1_2":
        // Exclude percentage and marksObtained from meaningful data check
        // These are calculated/backend fields and should not determine visibility
        return (
          // hasMeaningfulValue(section.year) ||
          hasMeaningfulValue(section.gsdpForFY) ||
          hasMeaningfulValue(section.actualCapex) ||
          hasMeaningfulValue(section.budgetaryCapex) ||
          hasMeaningfulValue(section.capexActualsToGSDP) ||
          hasMeaningfulValue(section.stateCapexUtilisation)
        );

      case "section1_3":
        // Check for ulbList array or totalULBs field
        return (
          hasArrayData(section?.ulbList) ||
          hasMeaningfulValue(section?.totalULBs)
        );
      case "section1_4":
        // Check for bondList array or totalULBs field
        return (
          hasArrayData(section?.bondList) ||
          hasMeaningfulValue(section?.totalULBs)
        );
      case "section1_5":
        // Check if hasIntermediary is set (yes or no)
        if (
          section.hasIntermediary === "yes" ||
          section.hasIntermediary === "no"
        ) {
          // If "no", also check for comment (required for "no")
          if (section.hasIntermediary === "no") {
            return hasMeaningfulValue(section.comment);
          }
          // If "yes", always return true (even if ffiArray is empty initially)
          return true;
        }
        // Legacy format: check for ffiArray
        return hasArrayData(section?.ffiArray) || hasArrayData(section);

      default:
        return false;
    }
  });
};

/**
 * Check if infra development section has data
 * Excludes SAVE_AS_DRAFT indicators from review (they should not be visible to STATE_APPROVER)
 */
export const hasInfraDevelopmentData = (formData: any): boolean => {
  if (!formData?.infraDevelopment) return false;

  const { infraDevelopment } = formData;

  // Check each section
  const sections = [
    "section2_1",
    "section2_2",
    "section2_3",
    "section2_4",
    "section2_5",
  ];

  return sections.some((sectionId) => {
    const section = infraDevelopment[sectionId];
    if (!section) return false;
    
    // Exclude SAVE_AS_DRAFT indicators from review
    const status = section?.status?.toUpperCase();
    if (status === "SAVE_AS_DRAFT") {
      return false;
    }

    switch (sectionId) {
      case "section2_1": {
        // Section 2.1 has boolean field (hasOverarchingPolicy)
        const hasBoolean =
          section?.hasOverarchingPolicy !== null &&
          section?.hasOverarchingPolicy !== undefined &&
          section?.hasOverarchingPolicy !== "";

        // If boolean is set, return true
        if (hasBoolean) {
          return true;
        }

        // Otherwise check array data (for backward compatibility)
        const items = Array.isArray(section?.infraActArray)
          ? section.infraActArray
          : Array.isArray(section)
          ? section
          : [];
        return (
          hasArrayData(items) &&
          items.some(
            (item: any) =>
              hasMeaningfulValue(item.sector) ||
              (item.files && hasArrayData(item.files))
          )
        );
      }
      case "section2_2": {
        // Section 2.2 has boolean field (hasSpecializedEntity) and comment field
        const hasBoolean =
          section?.hasSpecializedEntity !== null &&
          section?.hasSpecializedEntity !== undefined &&
          section?.hasSpecializedEntity !== "";
        const hasComment =
          section?.comment !== null &&
          section?.comment !== undefined &&
          section?.comment !== "";

        // If boolean or comment is set, return true
        if (hasBoolean || hasComment) {
          return true;
        }

        // Otherwise check array data
        const items = Array.isArray(section?.specializedEntityArray)
          ? section.specializedEntityArray
          : Array.isArray(section)
          ? section
          : [];
        return (
          hasArrayData(items) &&
          items.some(
            (item: any) =>
              hasMeaningfulValue(item.sector) ||
              (item.files && hasArrayData(item.files))
          )
        );
      }

      case "section2_3": {
        // Section 2.3 has boolean field (hasInfraDevelopmentPlan) and comment field
        const hasBoolean =
          section?.hasInfraDevelopmentPlan !== null &&
          section?.hasInfraDevelopmentPlan !== undefined &&
          section?.hasInfraDevelopmentPlan !== "";
        const hasComment =
          section?.comment !== null &&
          section?.comment !== undefined &&
          section?.comment !== "";

        console.log("🔍 [hasInfraDevelopmentData section2_3]:", {
          hasBoolean,
          hasComment,
          section,
        });

        // If boolean or comment is set, return true
        if (hasBoolean || hasComment) {
          console.log(
            "✅ [hasInfraDevelopmentData section2_3] Returning true - has boolean or comment"
          );
          return true;
        }

        // Otherwise check array data
        const items = Array.isArray(section?.infraDevelopmentArray)
          ? section.infraDevelopmentArray
          : Array.isArray(section)
          ? section
          : [];
        return (
          hasArrayData(items) &&
          items.some(
            (item: any) =>
              hasMeaningfulValue(item.sector) ||
              (item.files && hasArrayData(item.files))
          )
        );
      }

      case "section2_4": {
        // Section 2.4 has boolean field (hasInvestmentReady), comment, and websiteLink
        const hasBoolean =
          section?.hasInvestmentReady !== null &&
          section?.hasInvestmentReady !== undefined &&
          section?.hasInvestmentReady !== "";
        const hasComment =
          section?.comment !== null &&
          section?.comment !== undefined &&
          section?.comment !== "";
        const hasWebsiteLink =
          section?.websiteLink !== null &&
          section?.websiteLink !== undefined &&
          section?.websiteLink !== "";

        console.log("🔍 [hasInfraDevelopmentData section2_4]:", {
          hasBoolean,
          hasComment,
          hasWebsiteLink,
          section,
        });

        // If boolean, comment, or websiteLink is set, return true
        if (hasBoolean || hasComment || hasWebsiteLink) {
          console.log(
            "✅ [hasInfraDevelopmentData section2_4] Returning true - has boolean, comment, or websiteLink"
          );
          return true;
        }

        // Otherwise check array data
        const array = Array.isArray(section?.investmentReadyArray)
          ? section.investmentReadyArray
          : Array.isArray(section)
          ? section
          : [];
        return (
          hasArrayData(array) &&
          array.some(
            (item: any) =>
              hasMeaningfulValue(item.projectName) || hasFileData(item.dprFile)
          )
        );
      }

      case "section2_5": {
        // Section 2.5 has boolean field (hasAssetMonetization) and comment field
        const hasBoolean =
          section?.hasAssetMonetization !== null &&
          section?.hasAssetMonetization !== undefined &&
          section?.hasAssetMonetization !== "";
        const hasComment =
          section?.comment !== null &&
          section?.comment !== undefined &&
          section?.comment !== "";

        console.log("🔍 [hasInfraDevelopmentData section2_5]:", {
          hasBoolean,
          hasComment,
          section,
        });

        // If boolean or comment is set, return true
        if (hasBoolean || hasComment) {
          console.log(
            "✅ [hasInfraDevelopmentData section2_5] Returning true - has boolean or comment"
          );
          return true;
        }

        // Otherwise check array data
        const array = Array.isArray(section?.assetMonetizationArray)
          ? section.assetMonetizationArray
          : Array.isArray(section)
          ? section
          : [];
        return (
          hasArrayData(array) &&
          array.some(
            (item: any) =>
              hasMeaningfulValue(item.projectName) ||
              hasMeaningfulValue(item.sector) ||
              hasMeaningfulValue(item.type) ||
              hasMeaningfulValue(item.ownership) ||
              hasMeaningfulValue(item.location) ||
              hasMeaningfulValue(item.websiteLink) ||
              hasMeaningfulValue(item.estimatedMonetization)
          )
        );
      }

      default:
        return false;
    }
  });
};

/**
 * Check if PPP development section has data
 * Excludes SAVE_AS_DRAFT indicators from review (they should not be visible to STATE_APPROVER)
 */
export const hasPPPDevelopmentData = (formData: any): boolean => {
  if (!formData?.pppDevelopment) return false;

  const { pppDevelopment } = formData;

  // Check each section
  const sections = ["section3_1", "section3_2", "section3_3", "section3_4"];

  return sections.some((sectionId) => {
    const section = pppDevelopment[sectionId];
    if (!section) return false;
    
    // Exclude SAVE_AS_DRAFT indicators from review
    const status = section?.status?.toUpperCase();
    if (status === "SAVE_AS_DRAFT") {
      return false;
    }

    switch (sectionId) {
      case "section3_1":
        return (
          hasArrayData(section.files) ||
          hasFileData(section.file) ||
          hasMeaningfulValue(section.available) ||
          hasMeaningfulValue(section.comment)
        );

      case "section3_2":
        return (
          hasFileData(section.file) ||
          hasMeaningfulValue(section.available) ||
          hasMeaningfulValue(section.comment)
        );

      case "section3_3":
        return hasArrayData(section?.VGFArray) || hasArrayData(section);

      case "section3_4":
        return (
          // Check mandatory fields first
          hasMeaningfulValue(section.totalProjectsAwarded) ||
          hasMeaningfulValue(section.totalProjectCostAwarded) ||
          // Then check optional/calculated fields
          hasArrayData(section.projects) ||
          hasMeaningfulValue(section.proportion) ||
          hasMeaningfulValue(section.marksObtained) ||
          hasMeaningfulValue(section.tpcOfPPPProjects)
        );

      default:
        return false;
    }
  });
};

/**
 * Get sections that have data for a specific category
 */
export const getSectionsWithData = (
  formData: any,
  category: string
): string[] => {
  const sectionsWithData: string[] = [];

  if (!formData?.[category]) return sectionsWithData;

  const categoryData = formData[category];

  switch (category) {
    case "infraEnablers":
      if (hasInfraEnablersData(formData)) {
        const infraEnablersSections = [
          "section4_1",
          "section4_2",
          "section4_3",
          "section4_4",
          "section4_5",
        ];
        infraEnablersSections.forEach((sectionId) => {
          const section = categoryData[sectionId];
          if (section && hasSectionData(section, sectionId, "infraEnablers")) {
            sectionsWithData.push(sectionId);
          }
        });
      }
      break;

    case "infraFinancing":
      if (hasInfraFinancingData(formData)) {
        const infraFinancingSections = [
          "section1_1",
          "section1_2",
          "section1_3",
          "section1_4",
          "section1_5",
        ];
        infraFinancingSections.forEach((sectionId) => {
          const section = categoryData[sectionId];
          if (section && hasSectionData(section, sectionId, "infraFinancing")) {
            sectionsWithData.push(sectionId);
          }
        });
      }
      break;

    case "infraDevelopment":
      console.log("🔍 [getSectionsWithData] Checking infraDevelopment:", {
        hasInfraDevelopmentData: hasInfraDevelopmentData(formData),
        categoryData,
        formData,
      });

      if (hasInfraDevelopmentData(formData)) {
        const infraDevelopmentSections = [
          "section2_1",
          "section2_2",
          "section2_3",
          "section2_4",
          "section2_5",
        ];
        infraDevelopmentSections.forEach((sectionId) => {
          const section = categoryData[sectionId];
          console.log(`🔍 [getSectionsWithData] Checking ${sectionId}:`, {
            sectionExists: !!section,
            section,
            hasSectionData: section
              ? hasSectionData(section, sectionId, "infraDevelopment")
              : false,
          });
          if (
            section &&
            hasSectionData(section, sectionId, "infraDevelopment")
          ) {
            console.log(
              `✅ [getSectionsWithData] Adding ${sectionId} to sectionsWithData`
            );
            sectionsWithData.push(sectionId);
          }
        });
      } else {
        console.log(
          "❌ [getSectionsWithData] hasInfraDevelopmentData returned false, skipping section checks"
        );
      }

      console.log(
        "🔍 [getSectionsWithData] Final sectionsWithData:",
        sectionsWithData
      );
      break;

    case "pppDevelopment":
      if (hasPPPDevelopmentData(formData)) {
        const pppDevelopmentSections = [
          "section3_1",
          "section3_2",
          "section3_3",
          "section3_4",
        ];
        pppDevelopmentSections.forEach((sectionId) => {
          const section = categoryData[sectionId];
          if (section && hasSectionData(section, sectionId, "pppDevelopment")) {
            sectionsWithData.push(sectionId);
          }
        });
      }
      break;
  }

  return sectionsWithData;
};

/**
 * Check if a specific section has data
 * Excludes SAVE_AS_DRAFT indicators from review
 */
const hasSectionData = (
  section: any,
  sectionId: string,
  category: string
): boolean => {
  if (!section) return false;
  
  // Exclude SAVE_AS_DRAFT indicators from review
  const status = section?.status?.toUpperCase();
  if (status === "SAVE_AS_DRAFT") {
    return false;
  }

  switch (category) {
    case "infraEnablers":
      switch (sectionId) {
        case "section4_1":
          return (
            hasMeaningfulValue(section.available) ||
            hasMeaningfulValue(section.comment) ||
            hasFileData(section.file)
          );

        case "section4_2":
          // Check mandatory field: adopted (yes/no)
          if (section.adopted === "yes" || section.adopted === "no") {
            // If "yes", check for projects array
            if (section.adopted === "yes") {
              return hasArrayData(section.projects);
            }
            // If "no", check for comment (required)
            if (section.adopted === "no") {
              return hasMeaningfulValue(section.comment);
            }
          }
          // Fallback: check calculated fields (for backward compatibility)
          return (
            hasMeaningfulValue(section.marksObtained) ||
            hasMeaningfulValue(section.numberOfProjects)
          );

        case "section4_3":
          return (
            hasFileData(section.file) ||
            hasMeaningfulValue(section.adopted) ||
            hasMeaningfulValue(section.comment) ||
            hasMeaningfulValue(section.marksObtained)
          );

        case "section4_4":
          return (
            hasFileData(section.file) ||
            hasMeaningfulValue(section.impact) ||
            hasMeaningfulValue(section.implemented) ||
            hasMeaningfulValue(section.practiceName) ||
            hasArrayData(section.practices)
          );

        case "section4_5":
          // Check mandatory field: participated (yes/no)
          if (section.participated === "yes" || section.participated === "no") {
            // If "yes", check for capacityArray
            if (section.participated === "yes") {
              return hasArrayData(section.capacityArray);
            }
            // If "no", check for comment (required)
            if (section.participated === "no") {
              return hasMeaningfulValue(section.comment);
            }
          }
          // Fallback: check for capacityArray (for backward compatibility)
          return hasArrayData(section?.capacityArray);

        default:
          return false;
      }

    case "infraFinancing":
      switch (sectionId) {
        case "section1_1":
          // Exclude percentage and marksObtained from meaningful data check
          // These are calculated/backend fields and should not determine visibility
          return (
            hasMeaningfulValue(section.gsdpForFY) ||
            hasMeaningfulValue(section.allocationToGSDP) ||
            hasMeaningfulValue(section.capitalAllocation) ||
            hasMeaningfulValue(section.capexToCapexActuals) ||
            hasMeaningfulValue(section.stateCapexUtilisation)
          );
        case "section1_2":
          // Exclude percentage and marksObtained from meaningful data check
          // These are calculated/backend fields and should not determine visibility
          return (
            hasMeaningfulValue(section.gsdpForFY) ||
            hasMeaningfulValue(section.actualCapex) ||
            hasMeaningfulValue(section.budgetaryCapex) ||
            hasMeaningfulValue(section.capexActualsToGSDP) ||
            hasMeaningfulValue(section.stateCapexUtilisation)
          );
        case "section1_3":
          // Check for ulbList array or totalULBs field
          return (
            hasArrayData(section?.ulbList) ||
            hasMeaningfulValue(section?.totalULBs)
          );
        case "section1_4":
          // Check for bondList array or totalULBs field
          return (
            hasArrayData(section?.bondList) ||
            hasMeaningfulValue(section?.totalULBs)
          );
        case "section1_5":
          // Check if hasIntermediary is set (yes or no)
          if (
            section.hasIntermediary === "yes" ||
            section.hasIntermediary === "no"
          ) {
            // If "no", also check for comment (required for "no")
            if (section.hasIntermediary === "no") {
              return hasMeaningfulValue(section.comment);
            }
            // If "yes", always return true (even if ffiArray is empty initially)
            return true;
          }
          // Legacy format: check for ffiArray
          return hasArrayData(section?.ffiArray) || hasArrayData(section);
        default:
          return false;
      }

    case "infraDevelopment":
      switch (sectionId) {
        case "section2_1": {
          // Section 2.1 has boolean field (hasOverarchingPolicy)
          const hasBoolean =
            section?.hasOverarchingPolicy !== null &&
            section?.hasOverarchingPolicy !== undefined &&
            section?.hasOverarchingPolicy !== "";

          // If boolean is set, return true
          if (hasBoolean) {
            return true;
          }

          // Otherwise check array data (for backward compatibility)
          const items = Array.isArray(section?.infraActArray)
            ? section.infraActArray
            : Array.isArray(section)
            ? section
            : [];
          return (
            hasArrayData(items) &&
            items.some(
              (item: any) =>
                hasMeaningfulValue(item.sector) ||
                (item.files && hasArrayData(item.files))
            )
          );
        }
        case "section2_2": {
          // Section 2.2 has boolean field (hasSpecializedEntity) and comment field
          const hasBoolean =
            section?.hasSpecializedEntity !== null &&
            section?.hasSpecializedEntity !== undefined &&
            section?.hasSpecializedEntity !== "";
          const hasComment =
            section?.comment !== null &&
            section?.comment !== undefined &&
            section?.comment !== "";

          // If boolean or comment is set, return true
          if (hasBoolean || hasComment) {
            return true;
          }

          // Otherwise check array data
          const items = Array.isArray(section?.specializedEntityArray)
            ? section.specializedEntityArray
            : Array.isArray(section)
            ? section
            : [];
          return (
            hasArrayData(items) &&
            items.some(
              (item: any) =>
                hasMeaningfulValue(item.sector) ||
                (item.files && hasArrayData(item.files))
            )
          );
        }

        case "section2_3": {
          // Section 2.3 has boolean field (hasInfraDevelopmentPlan) and comment field
          const hasBoolean =
            section?.hasInfraDevelopmentPlan !== null &&
            section?.hasInfraDevelopmentPlan !== undefined &&
            section?.hasInfraDevelopmentPlan !== "";
          const hasComment =
            section?.comment !== null &&
            section?.comment !== undefined &&
            section?.comment !== "";

          console.log("🔍 [hasSectionData section2_3]:", {
            hasBoolean,
            hasComment,
            section,
          });

          // If boolean or comment is set, return true
          if (hasBoolean || hasComment) {
            console.log(
              "✅ [hasSectionData section2_3] Returning true - has boolean or comment"
            );
            return true;
          }

          // Otherwise check array data
          const items = Array.isArray(section?.["infraDevelopmentArray"])
            ? section["infraDevelopmentArray"]
            : Array.isArray(section)
            ? section
            : [];
          return (
            hasArrayData(items) &&
            items.some(
              (item: any) =>
                hasMeaningfulValue(item.sector) ||
                (item.files && hasArrayData(item.files))
            )
          );
        }

        case "section2_4": {
          // Section 2.4 has boolean field (hasInvestmentReady), comment, and websiteLink
          const hasBoolean =
            section?.hasInvestmentReady !== null &&
            section?.hasInvestmentReady !== undefined &&
            section?.hasInvestmentReady !== "";
          const hasComment =
            section?.comment !== null &&
            section?.comment !== undefined &&
            section?.comment !== "";
          const hasWebsiteLink =
            section?.websiteLink !== null &&
            section?.websiteLink !== undefined &&
            section?.websiteLink !== "";

          console.log("🔍 [hasSectionData section2_4]:", {
            hasBoolean,
            hasComment,
            hasWebsiteLink,
            section,
          });

          // If boolean, comment, or websiteLink is set, return true
          if (hasBoolean || hasComment || hasWebsiteLink) {
            console.log(
              "✅ [hasSectionData section2_4] Returning true - has boolean, comment, or websiteLink"
            );
            return true;
          }

          // Otherwise check array data
          const items = Array.isArray(section?.investmentReadyArray)
            ? section.investmentReadyArray
            : Array.isArray(section)
            ? section
            : [];
          return (
            hasArrayData(items) &&
            items.some(
              (item: any) =>
                hasMeaningfulValue(item.projectName) ||
                hasFileData(item.dprFile)
            )
          );
        }
        case "section2_5": {
          // Section 2.5 has boolean field (hasAssetMonetization) and comment field
          const hasBoolean =
            section?.hasAssetMonetization !== null &&
            section?.hasAssetMonetization !== undefined &&
            section?.hasAssetMonetization !== "";
          const hasComment =
            section?.comment !== null &&
            section?.comment !== undefined &&
            section?.comment !== "";

          console.log("🔍 [hasSectionData section2_5]:", {
            hasBoolean,
            hasComment,
            section,
          });

          // If boolean or comment is set, return true
          if (hasBoolean || hasComment) {
            console.log(
              "✅ [hasSectionData section2_5] Returning true - has boolean or comment"
            );
            return true;
          }

          // Otherwise check array data
          const items = Array.isArray(section?.assetMonetizationArray)
            ? section.assetMonetizationArray
            : Array.isArray(section)
            ? section
            : [];
          return (
            hasArrayData(items) &&
            items.some(
              (item: any) =>
                hasMeaningfulValue(item.projectName) ||
                hasMeaningfulValue(item.sector) ||
                hasMeaningfulValue(item.type) ||
                hasMeaningfulValue(item.ownership) ||
                hasMeaningfulValue(item.estimatedMonetization)
            )
          );
        }
        default:
          return false;
      }

    case "pppDevelopment":
      switch (sectionId) {
        case "section3_1":
          return (
            hasArrayData(section.files) ||
            hasFileData(section.file) ||
            hasMeaningfulValue(section.available) ||
            hasMeaningfulValue(section.comment)
          );
        case "section3_2":
          return (
            hasFileData(section.file) ||
            hasMeaningfulValue(section.available) ||
            hasMeaningfulValue(section.comment)
          );
        case "section3_3":
          return hasArrayData(section?.VGFArray) || hasArrayData(section);
        case "section3_4":
          return (
            // Check mandatory fields first
            hasMeaningfulValue(section.totalProjectsAwarded) ||
            hasMeaningfulValue(section.totalProjectCostAwarded) ||
            // Then check optional/calculated fields
            hasArrayData(section.projects) ||
            hasMeaningfulValue(section.proportion) ||
            hasMeaningfulValue(section.marksObtained) ||
            hasMeaningfulValue(section.tpcOfPPPProjects)
          );
        default:
          return false;
      }

    default:
      return false;
  }
};
