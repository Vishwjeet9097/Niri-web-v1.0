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
    "section4_6",
  ];

  return sections.some((sectionId) => {
    const section = infraEnablers[sectionId];
    if (!section) return false;

    switch (sectionId) {
      case "section4_1": {
        // Check if allEligible field is set (yes or no)
        if (hasMeaningfulValue(section?.allEligible)) {
          // If "no" is selected, check for comment
          if (section.allEligible === "no") {
            return hasMeaningfulValue(section?.comment);
          }
          // If "yes" is selected, check for websiteLink or file
          if (section.allEligible === "yes") {
            return hasMeaningfulValue(section.websiteLink) || hasFileData(section.file);
          }
        }
        // Backward compatibility: check for websiteLink or file directly
        return (
          hasMeaningfulValue(section.allEligible) ||
          hasMeaningfulValue(section.websiteLink) ||
          hasFileData(section.file)
        );
      }

      case "section4_2": {
        // Check if available field is set (yes or no)
        if (hasMeaningfulValue(section?.available)) {
          // If "no" is selected, check for comment
          if (section.available === "no") {
            return hasMeaningfulValue(section?.comment);
          }
          // If "yes" is selected, check for files
          if (section.available === "yes") {
            return hasFileData(section.files);
          }
        }
        // Backward compatibility: check for files directly
        return hasMeaningfulValue(section.available) || hasFileData(section.files);
      }

      case "section4_3": {
        // Check if adopted field is set (yes or no)
        if (hasMeaningfulValue(section?.adopted)) {
          // If "no" is selected, check for comment
          if (section.adopted === "no") {
            return hasMeaningfulValue(section?.comment);
          }
          // If "yes" is selected, check for projects array or other fields
          if (section.adopted === "yes") {
            return (
              hasArrayData(section?.projects) ||
              hasMeaningfulValue(section.marksObtained) ||
              hasMeaningfulValue(section.numberOfProjects)
            );
          }
        }
        // Backward compatibility: check for marksObtained or numberOfProjects directly
        return (
          hasMeaningfulValue(section.marksObtained) ||
          hasMeaningfulValue(section.numberOfProjects)
        );
      }

      case "section4_4": {
        // Check if adopted field is set (yes or no)
        if (hasMeaningfulValue(section?.adopted)) {
          // If "no" is selected, check for comment
          if (section.adopted === "no") {
            return hasMeaningfulValue(section?.comment);
          }
          // If "yes" is selected, check for files or marksObtained
          if (section.adopted === "yes") {
            return hasFileData(section.files) || hasMeaningfulValue(section.marksObtained);
          }
        }
        // Backward compatibility: check for files or marksObtained directly
        return (
          hasFileData(section.files) ||
          hasMeaningfulValue(section.adopted) ||
          hasMeaningfulValue(section.marksObtained)
        );
      }

      case "section4_5": {
        // Check if implemented field is set (yes or no)
        if (hasMeaningfulValue(section?.implemented)) {
          // If "no" is selected, check for comment
          if (section.implemented === "no") {
            return hasMeaningfulValue(section?.comment);
          }
          // If "yes" is selected, check for practices array or other fields
          if (section.implemented === "yes") {
            return (
              hasArrayData(section?.practices) ||
              hasFileData(section.file) ||
              hasMeaningfulValue(section.impact) ||
              hasMeaningfulValue(section.practiceName)
            );
          }
        }
        // Backward compatibility: check for file, impact, or practiceName directly
        return (
          hasFileData(section.file) ||
          hasMeaningfulValue(section.impact) ||
          hasMeaningfulValue(section.implemented) ||
          hasMeaningfulValue(section.practiceName)
        );
      }

      case "section4_6":
        // Section 4.6 has data if:
        // 1. participated field is set (yes or no)
        // 2. capacityArray has data (when participated === "yes")
        // 3. comment has data (when participated === "no")
        return (
          hasMeaningfulValue(section?.participated) ||
          hasArrayData(section?.capacityArray) ||
          hasMeaningfulValue(section?.comment)
        );

      default:
        return false;
    }
  });
};

/**
 * Check if infra financing section has data
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
        return hasArrayData(section?.ulbList) || hasMeaningfulValue(section?.totalULBs);
      case "section1_4":
        // Check for bondList array or totalULBs field
        return hasArrayData(section?.bondList) || hasMeaningfulValue(section?.totalULBs);
      case "section1_5": {
        // Check if hasIntermediary field is set (yes or no)
        if (hasMeaningfulValue(section?.hasIntermediary)) {
          // If "no" is selected, check for comment
          if (section.hasIntermediary === "no") {
            return hasMeaningfulValue(section?.comment);
          }
          // If "yes" is selected, check for ffiArray
          if (section.hasIntermediary === "yes") {
            return hasArrayData(section?.ffiArray) || hasArrayData(section);
          }
        }
        // Backward compatibility: check for ffiArray directly
        return hasArrayData(section?.ffiArray) || hasArrayData(section);
      }

      default:
        return false;
    }
  });
};

/**
 * Check if infra development section has data
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

    switch (sectionId) {
      case "section2_1":
      case "section2_2": {
        const arrayKey =
          sectionId === "section2_1"
            ? "infraActArray"
            : "specializedEntityArray";
        const items = Array.isArray(section?.[arrayKey])
          ? section[arrayKey]
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
        // Check if hasInfraDevelopmentPlan field is set (yes or no)
        if (hasMeaningfulValue(section?.hasInfraDevelopmentPlan)) {
          // If "no" is selected, check for comment
          if (section.hasInfraDevelopmentPlan === "no") {
            return hasMeaningfulValue(section?.comment);
          }
          // If "yes" is selected, check for infraDevelopmentArray
          if (section.hasInfraDevelopmentPlan === "yes") {
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
        }
        // Backward compatibility: check for infraDevelopmentArray directly
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
        // Check if hasInvestmentReady field is set (yes or no)
        if (hasMeaningfulValue(section?.hasInvestmentReady)) {
          // If "no" is selected, check for comment
          if (section.hasInvestmentReady === "no") {
            return hasMeaningfulValue(section?.comment);
          }
          // If "yes" is selected, check for investmentReadyArray
          if (section.hasInvestmentReady === "yes") {
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
        }
        // Backward compatibility: check for investmentReadyArray directly
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
 */
export const hasPPPDevelopmentData = (formData: any): boolean => {
  if (!formData?.pppDevelopment) return false;

  const { pppDevelopment } = formData;

  // Check each section
  const sections = ["section3_1", "section3_2", "section3_3", "section3_4"];

  return sections.some((sectionId) => {
    const section = pppDevelopment[sectionId];
    if (!section) return false;

    switch (sectionId) {
      case "section3_1": {
        // Check if available field is set (yes or no)
        if (hasMeaningfulValue(section?.available)) {
          // If "no" is selected, check for comment
          if (section.available === "no") {
            return hasMeaningfulValue(section?.comment);
          }
          // If "yes" is selected, check for files
          if (section.available === "yes") {
            return hasArrayData(section.files) || hasFileData(section.file);
          }
        }
        // Backward compatibility: check for files directly
        return hasArrayData(section.files) || hasFileData(section.file) || hasMeaningfulValue(section.available);
      }

      case "section3_2": {
        // Check if available field is set (yes or no)
        if (hasMeaningfulValue(section?.available)) {
          // If "no" is selected, check for comment
          if (section.available === "no") {
            return hasMeaningfulValue(section?.comment);
          }
          // If "yes" is selected, check for file
          if (section.available === "yes") {
            return hasFileData(section.file);
          }
        }
        // Backward compatibility: check for file directly
        return hasFileData(section.file) || hasMeaningfulValue(section.available);
      }

      case "section3_3":
        return hasArrayData(section?.VGFArray) || hasArrayData(section);

      case "section3_4":
        return (
          hasArrayData(section.projects) ||
          hasMeaningfulValue(section.proportion) ||
          hasMeaningfulValue(section.marksObtained) ||
          hasMeaningfulValue(section.tpcOfPPPProjects) ||
          hasMeaningfulValue(section.totalProjectsAwarded) ||
          hasMeaningfulValue(section.totalProjectCostAwarded) ||
          hasMeaningfulValue(section.totalProjects) ||
          hasMeaningfulValue(section.totalProjectCost)
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
          "section4_6",
        ];
        infraEnablersSections.forEach((sectionId) => {
          const section = categoryData[sectionId];
          if (section) {
            // Check if section has meaningful data
            const hasData = hasSectionData(section, sectionId, "infraEnablers");
            // Also check if section has "no" selected (even without comment) - this is still user input
            const hasNoSelected = 
              (sectionId === "section4_1" && (section.allEligible === "no" || section.allEligible === "No")) ||
              (sectionId === "section4_2" && (section.available === "no" || section.available === "No")) ||
              (sectionId === "section4_3" && (section.adopted === "no" || section.adopted === "No")) ||
              (sectionId === "section4_4" && (section.adopted === "no" || section.adopted === "No")) ||
              (sectionId === "section4_5" && (section.implemented === "no" || section.implemented === "No")) ||
              (sectionId === "section4_6" && (section.participated === "no" || section.participated === "No"));
            
            if (hasData || hasNoSelected) {
              sectionsWithData.push(sectionId);
            }
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
          if (section) {
            // Check if section has meaningful data
            const hasData = hasSectionData(section, sectionId, "infraFinancing");
            // Also check if section has "no" selected (even without comment) - this is still user input
            const hasNoSelected = sectionId === "section1_5" && 
              (section.hasIntermediary === "no" || section.hasIntermediary === "No");
            
            if (hasData || hasNoSelected) {
              sectionsWithData.push(sectionId);
            }
          }
        });
      }
      break;

    case "infraDevelopment":
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
          if (section) {
            // Check if section has meaningful data
            const hasData = hasSectionData(section, sectionId, "infraDevelopment");
            // Also check if section has "no" selected (even without comment) - this is still user input
            const hasNoSelected = 
              (sectionId === "section2_3" && (section.hasInfraDevelopmentPlan === "no" || section.hasInfraDevelopmentPlan === "No")) ||
              (sectionId === "section2_4" && (section.hasInvestmentReady === "no" || section.hasInvestmentReady === "No"));
            
            if (hasData || hasNoSelected) {
              sectionsWithData.push(sectionId);
            }
          }
        });
      }
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
          if (section) {
            // Check if section has meaningful data
            const hasData = hasSectionData(section, sectionId, "pppDevelopment");
            // Also check if section has "no" selected (even without comment) - this is still user input
            const hasNoSelected = 
              (sectionId === "section3_1" && (section.available === "no" || section.available === "No")) ||
              (sectionId === "section3_2" && (section.available === "no" || section.available === "No"));
            
            if (hasData || hasNoSelected) {
              sectionsWithData.push(sectionId);
            }
          }
        });
      }
      break;
  }

  return sectionsWithData;
};

/**
 * Check if a specific section has data
 * Exported so it can be used in StateAggregateReviewPage
 */
export const hasSectionData = (
  section: any,
  sectionId: string,
  category: string
): boolean => {
  if (!section) return false;

  switch (category) {
    case "infraEnablers":
      switch (sectionId) {
        case "section4_1": {
          // Check if allEligible field is set (yes or no)
          if (hasMeaningfulValue(section?.allEligible)) {
            // If "no" is selected, check for comment
            if (section.allEligible === "no") {
              return hasMeaningfulValue(section?.comment);
            }
            // If "yes" is selected, check for websiteLink or file
            if (section.allEligible === "yes") {
              return hasMeaningfulValue(section.websiteLink) || hasFileData(section.file);
            }
          }
          // Backward compatibility: check for websiteLink or file directly
          return (
            hasMeaningfulValue(section.allEligible) ||
            hasMeaningfulValue(section.websiteLink) ||
            hasFileData(section.file)
          );
        }
        case "section4_2": {
          // Check if available field is set (yes or no)
          if (hasMeaningfulValue(section?.available)) {
            // If "no" is selected, check for comment
            if (section.available === "no") {
              return hasMeaningfulValue(section?.comment);
            }
            // If "yes" is selected, check for files
            if (section.available === "yes") {
              return hasFileData(section.files);
            }
          }
          // Backward compatibility: check for files directly
          return hasMeaningfulValue(section.available) || hasFileData(section.files);
        }
        case "section4_3": {
          // Check if adopted field is set (yes or no)
          if (hasMeaningfulValue(section?.adopted)) {
            // If "no" is selected, check for comment
            if (section.adopted === "no") {
              return hasMeaningfulValue(section?.comment);
            }
            // If "yes" is selected, check for projects array or other fields
            if (section.adopted === "yes") {
              return (
                hasArrayData(section?.projects) ||
                hasMeaningfulValue(section.marksObtained) ||
                hasMeaningfulValue(section.numberOfProjects)
              );
            }
          }
          // Backward compatibility: check for marksObtained or numberOfProjects directly
          return (
            hasMeaningfulValue(section.marksObtained) ||
            hasMeaningfulValue(section.numberOfProjects)
          );
        }
        case "section4_4": {
          // Check if adopted field is set (yes or no)
          if (hasMeaningfulValue(section?.adopted)) {
            // If "no" is selected, check for comment
            if (section.adopted === "no") {
              return hasMeaningfulValue(section?.comment);
            }
            // If "yes" is selected, check for files or marksObtained
            if (section.adopted === "yes") {
              return hasFileData(section.files) || hasMeaningfulValue(section.marksObtained);
            }
          }
          // Backward compatibility: check for files or marksObtained directly
          return (
            hasFileData(section.files) ||
            hasMeaningfulValue(section.adopted) ||
            hasMeaningfulValue(section.marksObtained)
          );
        }
        case "section4_5": {
          // Check if implemented field is set (yes or no)
          if (hasMeaningfulValue(section?.implemented)) {
            // If "no" is selected, check for comment
            if (section.implemented === "no") {
              return hasMeaningfulValue(section?.comment);
            }
            // If "yes" is selected, check for practices array or other fields
            if (section.implemented === "yes") {
              return (
                hasArrayData(section?.practices) ||
                hasFileData(section.file) ||
                hasMeaningfulValue(section.impact) ||
                hasMeaningfulValue(section.practiceName)
              );
            }
          }
          // Backward compatibility: check for file, impact, or practiceName directly
          return (
            hasFileData(section.file) ||
            hasMeaningfulValue(section.impact) ||
            hasMeaningfulValue(section.implemented) ||
            hasMeaningfulValue(section.practiceName)
          );
        }
      case "section4_6":
        // Section 4.6 has data if:
        // 1. participated field is set (yes or no)
        // 2. capacityArray has data (when participated === "yes")
        // 3. comment has data (when participated === "no")
        return (
          hasMeaningfulValue(section?.participated) ||
          hasArrayData(section?.capacityArray) ||
          hasMeaningfulValue(section?.comment)
        );
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
          return hasArrayData(section?.ulbList) || hasMeaningfulValue(section?.totalULBs);
        case "section1_4":
          // Check for bondList array or totalULBs field
          return hasArrayData(section?.bondList) || hasMeaningfulValue(section?.totalULBs);
        case "section1_5": {
          // Check if hasIntermediary field is set (yes or no)
          if (hasMeaningfulValue(section?.hasIntermediary)) {
            // If "no" is selected, check for comment
            if (section.hasIntermediary === "no") {
              return hasMeaningfulValue(section?.comment);
            }
            // If "yes" is selected, check for ffiArray
            if (section.hasIntermediary === "yes") {
              return hasArrayData(section?.ffiArray) || hasArrayData(section);
            }
          }
          // Backward compatibility: check for ffiArray directly
          return hasArrayData(section?.ffiArray) || hasArrayData(section);
        }
        default:
          return false;
      }

    case "infraDevelopment":
      switch (sectionId) {
        case "section2_1":
        case "section2_2": {
          const arrayKey =
            sectionId === "section2_1"
              ? "infraActArray"
              : "specializedEntityArray";
          const items = Array.isArray(section?.[arrayKey])
            ? section[arrayKey]
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
          // Check if hasInfraDevelopmentPlan field is set (yes or no)
          if (hasMeaningfulValue(section?.hasInfraDevelopmentPlan)) {
            // If "no" is selected, check for comment
            if (section.hasInfraDevelopmentPlan === "no") {
              return hasMeaningfulValue(section?.comment);
            }
            // If "yes" is selected, check for infraDevelopmentArray
            if (section.hasInfraDevelopmentPlan === "yes") {
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
          }
          // Backward compatibility: check for infraDevelopmentArray directly
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
          // Check if hasInvestmentReady field is set (yes or no)
          if (hasMeaningfulValue(section?.hasInvestmentReady)) {
            // If "no" is selected, check for comment
            if (section.hasInvestmentReady === "no") {
              return hasMeaningfulValue(section?.comment);
            }
            // If "yes" is selected, check for investmentReadyArray
            if (section.hasInvestmentReady === "yes") {
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
          }
          // Backward compatibility: check for investmentReadyArray directly
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
        case "section3_1": {
          // Check if available field is set (yes or no)
          if (hasMeaningfulValue(section?.available)) {
            // If "no" is selected, check for comment
            if (section.available === "no") {
              return hasMeaningfulValue(section?.comment);
            }
            // If "yes" is selected, check for files
            if (section.available === "yes") {
              return hasArrayData(section.files) || hasFileData(section.file);
            }
          }
          // Backward compatibility: check for files directly
          return hasArrayData(section.files) || hasFileData(section.file) || hasMeaningfulValue(section.available);
        }
        case "section3_2": {
          // Check if available field is set (yes or no)
          if (hasMeaningfulValue(section?.available)) {
            // If "no" is selected, check for comment
            if (section.available === "no") {
              return hasMeaningfulValue(section?.comment);
            }
            // If "yes" is selected, check for file
            if (section.available === "yes") {
              return hasFileData(section.file);
            }
          }
          // Backward compatibility: check for file directly
          return hasFileData(section.file) || hasMeaningfulValue(section.available);
        }
        case "section3_3":
          return hasArrayData(section?.VGFArray) || hasArrayData(section);
        case "section3_4":
          return (
            hasArrayData(section.projects) ||
            hasMeaningfulValue(section.proportion) ||
            hasMeaningfulValue(section.marksObtained) ||
            hasMeaningfulValue(section.tpcOfPPPProjects) ||
            hasMeaningfulValue(section.totalProjectsAwarded) ||
            hasMeaningfulValue(section.totalProjectCostAwarded) ||
            hasMeaningfulValue(section.totalProjects) ||
            hasMeaningfulValue(section.totalProjectCost)
          );
        default:
          return false;
      }

    default:
      return false;
  }
};
