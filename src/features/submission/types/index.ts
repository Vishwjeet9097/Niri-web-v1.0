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

export interface FileUpload {
  id: string;
  file: File | null;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
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
  section1_3: Array<{
    id: string;
    cityName: string;
    ulb: string;
    ratingDate: string;
    rating: string;
  }>;
  section1_4: Array<{
    id: string;
    bondType: string;
    cityName: string;
    issuingAuthority: string;
    value: string;
  }>;
  section1_5: Array<{
    id: string;
    organisationName: string;
    organisationType: string;
    yearEstablished: string;
    totalFunding: string;
    website: string;
  }>;
}

export interface InfraDevelopmentData {
  section2_1: Array<{
    id: string;
    sector: string;
    files: FileUpload[];
  }>;
  section2_2: Array<{
    id: string;
    sector: string;
    files: FileUpload[];
  }>;
  section2_3: Array<{
    id: string;
    sector: string;
    files: FileUpload[];
  }>;
  section2_4: Array<{
    id: string;
    projectName: string;
    dprFile: FileUpload | null;
  }>;
  section2_5: Array<{
    id: string;
    projectName: string;
    sector: string;
    type: string;
    ownership: string;
    estimatedMonetization: string;
  }>;
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
  section3_3: Array<{
    id: string;
    projectName: string;
    sector: string;
    type: string;
    submissionDate: string;
    file: FileUpload | null;
    // Calculation fields
    marksObtained?: number;
  }>;
  section3_4: {
    tpcOfPPPProjects: string; // A₁
    totalTPC: string; // A₂
    // Calculation fields
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
  section4_6: Array<{
    id: string;
    officerName: string;
    designation: string;
    programName: string;
    organiser: string;
    trainingType: string;
    marksObtained?: number;
  }>;
}

export interface SubmissionFormData {
  infraFinancing: InfraFinancingData;
  infraDevelopment: InfraDevelopmentData;
  pppDevelopment: PPPDevelopmentData;
  infraEnablers: InfraEnablersData;
}
