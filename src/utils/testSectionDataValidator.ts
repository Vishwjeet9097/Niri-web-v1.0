/**
 * Test utility for section data validator
 * This file can be used to test the section data validator with real data
 */

import {
  hasInfraEnablersData,
  hasInfraFinancingData,
  hasInfraDevelopmentData,
  hasPPPDevelopmentData,
  getSectionsWithData,
} from "./sectionDataValidator";

// Test data from the user's response
const testFormData = {
  infraEnablers: {
    section4_1: {
      allEligible: "yes",
      websiteLink:
        "https://www.myntra.com/mailers/topwear/snitch/snitch-white-self-design-polo-collar-slim-fit-cotton-t-shirt/24101988/buy?utm_source=social_share_pdp&utm_medium=deeplink&utm_campaign=social_share_pdp_deeplink",
    },
    section4_2: {
      file: null,
      available: "",
    },
    section4_3: {
      marksObtained: 0,
      numberOfProjects: "",
    },
    section4_4: {
      file: null,
      adopted: "",
      marksObtained: 0,
    },
    section4_5: {
      file: null,
      impact: "",
      implemented: "",
      practiceName: "",
    },
    section4_6: [],
  },
  infraFinancing: {
    section1_1: {
      year: "",
      gsdpForFY: "",
      percentage: 0,
      marksObtained: 0,
      allocationToGSDP: "",
      capitalAllocation: "",
      capexToCapexActuals: "",
      stateCapexUtilisation: "",
    },
    section1_2: {
      year: "",
      gsdpForFY: "",
      percentage: 0,
      actualCapex: "",
      marksObtained: 0,
      budgetaryCapex: "",
      capexActualsToGSDP: "",
      stateCapexUtilisation: "",
    },
    section1_3: [],
    section1_4: [],
    section1_5: [],
  },
  pppDevelopment: {
    section3_1: {
      file: null,
      available: "",
    },
    section3_2: {
      file: {
        id: "5ec99eb8-5fea-4a03-9220-79ea79d01891",
        file: {},
        fileName: "170012002452Regulations for Ph.pdf",
        fileSize: 650010,
        uploadedAt: 1761236465452,
      },
      available: "yes",
    },
    section3_3: [],
    section3_4: {
      totalTPC: "",
      proportion: 0,
      marksObtained: 0,
      tpcOfPPPProjects: "",
    },
  },
  infraDevelopment: {
    section2_1: [
      {
        id: "dc76ec57-e638-4d89-81ca-2974bccf0ec5",
        files: [
          {
            id: "f6b744ab-10e9-41eb-821e-d7ee228af91c",
            file: {},
            fileName: "BCCCO_2025_8478513_jyoti.pdf",
            fileSize: 93780,
            uploadedAt: 1761236441010,
          },
        ],
        sector: "Education",
      },
      {
        id: "76902ab4-2a8b-465f-95c9-1a89c85591e3",
        files: [
          {
            id: "f3ef5813-9b96-4582-be1c-e3ddef5a47c8",
            file: {},
            fileName: "170012002452Regulations for Ph.pdf",
            fileSize: 650010,
            uploadedAt: 1761240660983,
          },
        ],
        sector: "Water Supply",
      },
    ],
    section2_2: [],
    section2_3: [],
    section2_4: [
      {
        id: "75251d70-3409-4a4f-91c1-7ab5a534c0a1",
        dprFile: {
          id: "9bd8f8a7-757b-4c81-8b61-9b23c03bbb7a",
          file: {},
          fileName: "170012002452Regulations for Ph.pdf",
          fileSize: 650010,
          uploadedAt: 1761236453633,
        },
        projectName: "FGOV",
      },
    ],
    section2_5: [],
  },
};

export const testSectionDataValidator = () => {
  console.log("🧪 Testing Section Data Validator with real data...");

  // Test Infra Enablers
  console.log("\n📊 Infra Enablers:");
  console.log("Has data:", hasInfraEnablersData(testFormData));
  console.log(
    "Sections with data:",
    getSectionsWithData(testFormData, "infraEnablers")
  );

  // Test Infra Financing
  console.log("\n💰 Infra Financing:");
  console.log("Has data:", hasInfraFinancingData(testFormData));
  console.log(
    "Sections with data:",
    getSectionsWithData(testFormData, "infraFinancing")
  );

  // Test Infra Development
  console.log("\n🏗️ Infra Development:");
  console.log("Has data:", hasInfraDevelopmentData(testFormData));
  console.log(
    "Sections with data:",
    getSectionsWithData(testFormData, "infraDevelopment")
  );

  // Test PPP Development
  console.log("\n🤝 PPP Development:");
  console.log("Has data:", hasPPPDevelopmentData(testFormData));
  console.log(
    "Sections with data:",
    getSectionsWithData(testFormData, "pppDevelopment")
  );

  console.log("\n✅ Test completed!");

  return {
    infraEnablers: {
      hasData: hasInfraEnablersData(testFormData),
      sectionsWithData: getSectionsWithData(testFormData, "infraEnablers"),
    },
    infraFinancing: {
      hasData: hasInfraFinancingData(testFormData),
      sectionsWithData: getSectionsWithData(testFormData, "infraFinancing"),
    },
    infraDevelopment: {
      hasData: hasInfraDevelopmentData(testFormData),
      sectionsWithData: getSectionsWithData(testFormData, "infraDevelopment"),
    },
    pppDevelopment: {
      hasData: hasPPPDevelopmentData(testFormData),
      sectionsWithData: getSectionsWithData(testFormData, "pppDevelopment"),
    },
  };
};

// Expected results based on the data:
// infraEnablers: should show section4_1 only
// infraFinancing: should show no data (all sections are empty)
// infraDevelopment: should show section2_1 and section2_4
// pppDevelopment: should show section3_2 only
