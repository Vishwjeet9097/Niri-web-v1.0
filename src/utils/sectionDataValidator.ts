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
      case "section4_1":
        return (
          hasMeaningfulValue(section.allEligible) ||
          hasMeaningfulValue(section.websiteLink) ||
          hasFileData(section.file)
        );

      case "section4_2":
        return (
          hasMeaningfulValue(section.available) || hasFileData(section.files)
        );

      case "section4_3":
        return (
          hasMeaningfulValue(section.marksObtained) ||
          hasMeaningfulValue(section.numberOfProjects)
        );

      case "section4_4":
        return (
          hasFileData(section.files) ||
          hasMeaningfulValue(section.adopted) ||
          hasMeaningfulValue(section.marksObtained)
        );

      case "section4_5":
        return (
          hasFileData(section.file) ||
          hasMeaningfulValue(section.impact) ||
          hasMeaningfulValue(section.implemented) ||
          hasMeaningfulValue(section.practiceName)
        );

      case "section4_6":
        return hasArrayData(section?.capacityArray);

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
      case "section1_5":
        return hasArrayData(section?.ffiArray) || hasArrayData(section);

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
      case "section2_2":
      case "section2_3": {
        const arrayKey =
          sectionId === "section2_1"
            ? "infraActArray"
            : sectionId === "section2_2"
            ? "specializedEntityArray"
            : "infraDevelopmentArray";
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

      case "section2_4": {
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
      case "section3_1":
        return (
          hasArrayData(section.files) || hasFileData(section.file) || hasMeaningfulValue(section.available)
        );

      case "section3_2":
        return (
          hasFileData(section.file) || hasMeaningfulValue(section.available)
        );

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
          if (
            section &&
            hasSectionData(section, sectionId, "infraDevelopment")
          ) {
            sectionsWithData.push(sectionId);
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
 */
const hasSectionData = (
  section: any,
  sectionId: string,
  category: string
): boolean => {
  if (!section) return false;

  switch (category) {
    case "infraEnablers":
      switch (sectionId) {
        case "section4_1":
          return (
            hasMeaningfulValue(section.allEligible) ||
            hasMeaningfulValue(section.websiteLink) ||
            hasFileData(section.file)
          );
        case "section4_2":
          return (
            hasMeaningfulValue(section.available) || hasFileData(section.files)
          );
        case "section4_3":
          return (
            hasMeaningfulValue(section.marksObtained) ||
            hasMeaningfulValue(section.numberOfProjects)
          );
        case "section4_4":
          return (
            hasFileData(section.files) ||
            hasMeaningfulValue(section.adopted) ||
            hasMeaningfulValue(section.marksObtained)
          );
        case "section4_5":
          return (
            hasFileData(section.file) ||
            hasMeaningfulValue(section.impact) ||
            hasMeaningfulValue(section.implemented) ||
            hasMeaningfulValue(section.practiceName)
          );
        case "section4_6":
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
          return hasArrayData(section?.ulbList) || hasMeaningfulValue(section?.totalULBs);
        case "section1_4":
          // Check for bondList array or totalULBs field
          return hasArrayData(section?.bondList) || hasMeaningfulValue(section?.totalULBs);
        case "section1_5":
          return hasArrayData(section?.ffiArray) || hasArrayData(section);
        default:
          return false;
      }

    case "infraDevelopment":
      switch (sectionId) {
        case "section2_1":
        case "section2_2":
        case "section2_3": {
          const arrayKey =
            sectionId === "section2_1"
              ? "infraActArray"
              : sectionId === "section2_2"
              ? "specializedEntityArray"
              : "infraDevelopmentArray";
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
        case "section2_4": {
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
        case "section3_1":
          return (
            hasArrayData(section.files) || hasFileData(section.file) || hasMeaningfulValue(section.available)
          );
        case "section3_2":
          return (
            hasFileData(section.file) || hasMeaningfulValue(section.available)
          );
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
