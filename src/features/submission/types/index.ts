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
  fileSize: number;
  uploadedAt: number;
  filePath?: string; // ✅ path returned from backend (e.g. submissions/...pdf)
  fileUrl?: string;  // ✅ full URL or signed URL from backend
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
    totalULBs: number; //  A₂
    ulbList: Array<{
      // A₁
      id: string;
      cityName: string;
      ulb: string;
      ratingDate: string;
      rating: string;
    }>;
  };
  section1_4: {
    totalULBs: number;
    bondList: Array<{
      id: string;
      bondType: string;
      cityName: string;
      issuingAuthority: string;
      value: string;
    }>;
  };
  section1_5: {
    ffiArray: Array<{
    id: string;
    hasIntermediary?: boolean;
    organisationName: string;
    organisationType: string;
    yearEstablished: string;
    totalFunding: string;
    website: string;
    comment?: string;
  }>;}
}

export interface InfraDevelopmentData {
  section2_1: {
    infraActArray: Array<{
    id: string;
    sector: string;
    files: FileUpload[];
  }>};
  section2_2: {
    specializedEntityArray: Array<{
    id: string;
    sector: string;
    files: FileUpload[];
  }>};
  section2_3: 
  {infraDevelopmentArray :Array<{
    id: string;
    sector: string;
    files: FileUpload[];
  }>};
  section2_4: {
    investmentReadyArray: Array<{
    id: string;
    projectName: string;
    dprFile: FileUpload | null;
  }>};
  section2_5: {
    assetMonetizationArray: Array<{
    id: string;
    projectName: string;
    sector: string;
    type: string;
    ownership: string;
    estimatedMonetization: string;
  }>};
}

export interface PPPDevelopmentData {
  section3_1: {
    available: "yes" | "no" | "";
    file: FileUpload | null;
  };
  section3_2: {
    available: "yes" | "no" | "";
    file: FileUpload | null;
  };
  section3_3: {
    VGFArray: Array<{
    id: string;
    projectName: string;
    sector: string;
    type: string;
    submissionDate: string;
    file: FileUpload | null;
    marksObtained?: number;
  }>};
  section3_4: {
    projects: Array<{
      id: string;
      nameOfProject: string; // Name of PPP/Bankable Projects
      nipId: string; // NIP ID
      fundingSource: string; // Funding Source (In case of bankable project)
      infrastructureSector: string; // Infrastructure Sector
      dateOfAward: string; // Date of Award
      capexPercentage: string; // % of Capex funded by non-Govt sources
    }>;
    // Calculation fields
    tpcOfPPPProjects?: string; // A₁ - Calculated total from projects
    proportion?: number;
    marksObtained?: number;
  };
}

export interface InfraEnablersData {
  section4_1: {
    allEligible: "yes" | "no" | "";
    websiteLink: string;
  };
  section4_2: {
    available: "yes" | "no" | "";
    file: FileUpload | null;
  };
  section4_3: {
    numberOfProjects: string; // A₁
    // Calculation fields
    marksObtained?: number;
  };
  section4_4: {
    adopted: "yes" | "no" | "";
    file: FileUpload | null;
    // Calculation fields
    marksObtained?: number;
  };
  section4_5: {
    implemented: "yes" | "no" | "";
    practiceName: string;
    impact: string;
    file: FileUpload | null;
  };
  section4_6: {
    capacityArray: Array<{
    id: string;
    officerName: string;
    designation: string;
    programName: string;
    organiser: string;
    trainingType: string;
    marksObtained?: number;
  }>};
}

export interface SubmissionFormData {
  infraFinancing: InfraFinancingData;
  infraDevelopment: InfraDevelopmentData;
  pppDevelopment: PPPDevelopmentData;
  infraEnablers: InfraEnablersData;
}
