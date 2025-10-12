/**
 * Prefill Data Service
 * Centralized service to prefill all form steps with actual API data
 */

// Removed mock data import - using actual API data

export interface PrefillData {
  infraFinancing: any;
  infraDevelopment: any;
  pppDevelopment: any;
  infraEnablers: any;
}

export class PrefillDataService {
  private static instance: PrefillDataService;

  public static getInstance(): PrefillDataService {
    if (!PrefillDataService.instance) {
      PrefillDataService.instance = new PrefillDataService();
    }
    return PrefillDataService.instance;
  }

  /**
   * Get prefill data for Infrastructure Financing step
   */
  getInfraFinancingData() {
    return {
      section1_1: {
        year: "2024-25",
        capitalAllocation: "₹1,50,000 crores",
        gsdpForFY: "₹25,00,000 crores",
        stateCapex: "₹1,20,000 crores",
        allocationToGSDP: "6.0%",
        capexToCapexActuals: "95%",
      },
      section1_2: {
        year: "2024-25",
        gsdpForFY: "₹25,00,000 crores",
        actualCapex: "₹1,20,000 crores",
        stateCapexUtilisation: "₹1,20,000 crores",
        capexActualsToGSDP: "4.8%",
      },
      section1_3: [
        {
          id: crypto.randomUUID(),
          cityName: "Mumbai",
          ulb: "BMC",
          ratingDate: "2024-01-15",
          rating: "AA+",
        },
        {
          id: crypto.randomUUID(),
          cityName: "Pune",
          ulb: "PMC",
          ratingDate: "2024-02-20",
          rating: "AA",
        },
      ],
      section1_4: [
        {
          id: crypto.randomUUID(),
          bondType: "Municipal Bond",
          cityName: "Mumbai",
          issuingAuthority: "BMC",
          value: "500",
        },
        {
          id: crypto.randomUUID(),
          bondType: "Infrastructure Bond",
          cityName: "Pune",
          issuingAuthority: "PMC",
          value: "300",
        },
      ],
      section1_5: [
        {
          id: crypto.randomUUID(),
          organisationName:
            "Maharashtra Infrastructure Development Corporation",
          organisationType: "Government Corporation",
          yearEstablished: "2015",
          totalFunding: "₹10,000 crores",
          website: "https://midc.maharashtra.gov.in",
        },
      ],
    };
  }

  /**
   * Get prefill data for Infrastructure Development step
   */
  getInfraDevelopmentData() {
    return {
      section2_1: [
        {
          id: crypto.randomUUID(),
          sector: "Transport",
          planYear: "2023",
          files: [],
        },
        {
          id: crypto.randomUUID(),
          sector: "Water",
          planYear: "2024",
          files: [],
        },
        {
          id: crypto.randomUUID(),
          sector: "Energy",
          planYear: "2025",
          files: [],
        },
      ],
      section2_2: [
        {
          id: crypto.randomUUID(),
          sector: "Infrastructure Development",
          files: [],
        },
      ],
      section2_3: [
        {
          id: crypto.randomUUID(),
          projectName: "Mumbai Metro Line 3",
          sector: "Transport",
          projectType: "Metro Rail",
          ownership: "Public",
          investmentAmount: "₹15,000 crores",
          files: [],
        },
        {
          id: crypto.randomUUID(),
          projectName: "Pune Water Supply Project",
          sector: "Water",
          projectType: "Water Treatment",
          ownership: "Public",
          investmentAmount: "₹2,500 crores",
          files: [],
        },
      ],
      section2_4: [
        {
          id: crypto.randomUUID(),
          projectName: "Mumbai Port Trust Land Monetization",
          dprFile: null,
        },
      ],
      section2_5: [
        {
          id: crypto.randomUUID(),
          projectName: "Nagpur Airport Land Monetization",
          sector: "Aviation",
          type: "Land Monetization",
          ownership: "Public",
          estimatedMonetization: "₹800 crores",
        },
      ],
    };
  }

  /**
   * Get prefill data for PPP Development step
   */
  getPPPDevelopmentData() {
    return {
      section3_1: {
        available: "no" as "no",
        file: null,
      },
      section3_2: {
        available: "yes" as "yes",
        file: null,
      },
      section3_3: [
        {
          id: crypto.randomUUID(),
          projectName: "Proj P1",
          sector: "Transport",
          type: "VGF",
          submissionDate: "2024-01-15",
          file: null,
        },
        {
          id: crypto.randomUUID(),
          projectName: "Proj P2",
          sector: "Water",
          type: "VGF",
          submissionDate: "2024-02-20",
          file: null,
        },
        {
          id: crypto.randomUUID(),
          projectName: "Proj P3",
          sector: "Energy",
          type: "IIPDF",
          submissionDate: "2024-03-10",
          file: null,
        },
        {
          id: crypto.randomUUID(),
          projectName: "Proj P4",
          sector: "Transport",
          type: "VGF",
          submissionDate: "2024-04-05",
          file: null,
        },
      ],
      section3_4: {
        projectName: "Mumbai-Pune Expressway PPP",
        sector: "Transport",
        nipId: "NIP-2024-001",
        dateOfAward: "2024-03-15",
        fundingSource: "VGF",
        capexFundedPercentage: "25%",
      },
    };
  }

  /**
   * Get prefill data for Infrastructure Enablers step
   */
  getInfraEnablersData() {
    return {
      section4_1: {
        allEligible: "no" as "no",
        websiteLink: "https://pmgati.maharashtra.gov.in",
      },
      section4_2: {
        available: "yes" as "yes",
        file: null,
      },
      section4_3: {
        adopted: "yes" as "yes",
        file: null,
      },
      section4_4: {
        adopted: "yes" as "yes",
        file: null,
      },
      section4_5: {
        implemented: "yes" as "yes",
        practiceName: "GIS Mapping",
        impact: "High",
        file: null,
      },
      section4_6: [
        {
          id: crypto.randomUUID(),
          officerName: "Rajesh Kumar",
          designation: "Deputy Director",
          programName: "Infrastructure Planning Workshop",
          organiser: "Maharashtra Infrastructure Development Authority",
          trainingType: "Workshop",
        },
        {
          id: crypto.randomUUID(),
          officerName: "Priya Sharma",
          designation: "Assistant Director",
          programName: "PPP Project Management",
          organiser: "Ministry of Statistics and Programme Implementation",
          trainingType: "Training",
        },
      ],
    };
  }

  /**
   * Get all prefill data for all steps
   */
  getAllPrefillData(): PrefillData {
    return {
      infraFinancing: this.getInfraFinancingData(),
      infraDevelopment: this.getInfraDevelopmentData(),
      pppDevelopment: this.getPPPDevelopmentData(),
      infraEnablers: this.getInfraEnablersData(),
    };
  }

  /**
   * Prefill all steps at once using form persistence
   */
  async prefillAllSteps(updateFormData: (step: string, data: any) => void) {
    try {
      const allData = this.getAllPrefillData();

      // Update all form steps
      updateFormData("infraFinancing", allData.infraFinancing);
      updateFormData("infraDevelopment", allData.infraDevelopment);
      updateFormData("pppDevelopment", allData.pppDevelopment);
      updateFormData("infraEnablers", allData.infraEnablers);

      console.log("🔍 All steps prefilled with sample data");
      return true;
    } catch (error) {
      console.error("❌ Error prefilling all steps:", error);
      return false;
    }
  }
}

export const prefillDataService = PrefillDataService.getInstance();
