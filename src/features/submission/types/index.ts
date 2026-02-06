export interface SubmissionStep {
  id: number;
  key: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  sectionsCompleted?: number;
  totalSections?: number;
}

// ✅ Enhanced FileUpload interface (matches backend + frontend upload usage)
export interface FileUpload {
  id: string;
  file: File | null; // Local file (null once uploaded to backend)
  fileName: string;
  originalName?: string; // Original file name before upload (without UUID prefix)
  fileSize: number;
  uploadedAt: number;
  filePath?: string; // ✅ path returned from backend (e.g. submissions/...pdf)
  fileUrl?: string; // ✅ full URL or signed URL from backend
  mimeType?: string; // ✅ optional for preview / validation
}

export interface InfraFinancingData {
  section1_1: {
    year: string;
    capitalAllocation: string; // A₁
    gsdpForFY: string; // A₂
    stateCapexUtilisation: string;
    allocationToGSDP: string;
    capexToCapexActuals: string;
    // Calculation fields
    percentage?: number;
    marksObtained?: number;
  };
  section1_2: {
    year: string;
    gsdpForFY: string;
    actualCapex: string; // A₁
    budgetaryCapex: string; // A₂
    stateCapexUtilisation: string;
    capexActualsToGSDP: string;
    // Calculation fields
    percentage?: number;
    marksObtained?: number;
  };
  section1_3: {
    totalULBs?: number; //  A₂ – optional so "empty" until user fills (mandatory field)
    ulbList: Array<{
      // A₁
      id: string;
      cityName: string;
      ulb: string;
      ratingDate: string;
      rating: string;
      file?: FileUpload | null;
      noDocumentAvailable?: boolean;
    }>;
  };
  section1_4: {
    totalULBs?: number; // optional so "empty" until user fills (mandatory field)
    bondList: Array<{
      id: string;
      bondType: string;
      ulb: string;
      cityName: string;
      issuingAuthority: string;
      value: string;
      tenorOfBond: string;
    }>;
  };
  section1_5: {
    ffiArray: Array<{
      id: string;

      organisationName: string;
      organisationType: string;
      yearEstablished: string;
      totalFunding: string;
      website: string;
    }>;
    hasIntermediary?: string;
    comment?: string;
  };
}

export interface InfraDevelopmentData {
  section2_1: {
    infraActArray: Array<{
      id: string;
      sector: string;
      files: FileUpload[];
      noDocumentAvailable?: boolean;
    }>;
    hasOverarchingPolicy?: string;
  };
  section2_2: {
    specializedEntityArray: Array<{
      id: string;
      files: FileUpload[];
      noDocumentAvailable?: boolean;
    }>;
    hasSpecializedEntity?: string;
    comment?: string;
  };
  section2_3: {
    infraDevelopmentArray: Array<{
      id: string;
      sector: string;
      files: FileUpload[];
      comment?: string;
      noDocumentAvailable?: boolean;
    }>;
    hasInfraDevelopmentPlan?: string;
    comment?: string;
  };
  section2_4: {
    investmentReadyArray: Array<{
      id: string;
      projectName?: string;
      sector?: string;
      status?: string;
      projectSize?: string;
    }>;
    hasInvestmentReady?: string;
    comment?: string;
    websiteLink?: string;
  };
  section2_5: {
    assetMonetizationArray: Array<{
      id: string;
      projectName?: string;
      sector?: string;
      type?: string;
      ownership?: string;
      location?: string;
      estimatedMonetization?: string;
    }>;
    hasAssetMonetization?: string;
    comment?: string;
    websiteLink?: string;
  };
}

export interface PPPDevelopmentData {
  section3_1: {
    available: "yes" | "no" | "";
    file: FileUpload | null;
    comment?: string;
    noDocumentAvailable?: boolean;
  };
  section3_2: {
    available: "yes" | "no" | "";
    file: FileUpload | null;
    comment?: string;
    noDocumentAvailable?: boolean;
  };
  section3_3: {
    /** Yes = proposals submitted under VGF/IIPDF; No = no proposals (comment required) */
    available?: "" | "yes" | "no";
    comment?: string;
    VGFArray: Array<{
      id?: string;
      projectName?: string;
      sector?: string;
      scheme?: string;
      submissionDate?: string;
      totalProjectCost?: string;
      statusOfProject?: string;
      file: FileUpload | null;
      marksObtained?: number;
      noDocumentAvailable?: boolean;
    }>;
  };
  section3_4: {
    projects: Array<{
      id: string;
      nameOfProject: string; // Name of Awarded PPP Projects
      infrastructureSector: string; // Infrastructure Sector
      dateOfAward: string; // Date of Award
      totalProjectCost: string; // Total Project Cost (in crore)
    }>;

    // Calculation fields
    tpcOfPPPProjects?: string; // A₁ - Calculated total from projects
    proportion?: number;
    marksObtained?: number;
    totalProjectsAwarded?: string;
    totalProjectCostAwarded?: string;
    totalProjectCost?: string;
  };
}

export interface InfraEnablersData {
  section4_1: {
    available: "yes" | "no" | "";
    file: FileUpload | null;
    websiteLink?: string;
    comment?: string;
    noDocumentAvailable?: boolean;
  };
  section4_2: {
    projects: Array<{
      id: string;
      projectName: string;
      sector: string;
      statusOfProject?: string;
      file: FileUpload | null;
      noDocumentAvailable?: boolean;
    }>;
    adopted: "yes" | "no" | "";
    comment?: string;
    // Calculation fields
    numberOfProjects?: string;
    marksObtained?: number;
  };
  section4_3: {
    adopted: "yes" | "no" | "";
    file: FileUpload | null;
    noDocumentAvailable?: boolean;
    // Calculation fields
    marksObtained?: number;
    comment?: string;
  };
  section4_4: {
    implemented: "yes" | "no" | "";
    practices: Array<{
      id: string;
      practiceName: string;
      impact: string;
      file: FileUpload | null;
      noDocumentAvailable?: boolean;
    }>;
    comment?: string;
  };
  section4_5: {
    participated?: string;
    capacityArray: Array<{
      id: string;
      officerName: string;
      designation: string;
      programName: string;
      organiser: string;
      trainingType: string;
      trainingPeriod: string; // MMYY format
      marksObtained?: number;
    }>;
    comment?: string;
  };
}

export interface SubmissionFormData {
  infraFinancing: InfraFinancingData;
  infraDevelopment: InfraDevelopmentData;
  pppDevelopment: PPPDevelopmentData;
  infraEnablers: InfraEnablersData;
}
