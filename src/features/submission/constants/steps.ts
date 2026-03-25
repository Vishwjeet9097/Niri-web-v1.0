import { SubmissionStep } from "../types";

export const SUBMISSION_STEPS: SubmissionStep[] = [
  {
    id: 1,
    key: "infra-financing",
    title: "Infra Financing",
    description:
      "Data related to infrastructure financing and budget allocation",
    points: 250,
    completed: false,
    totalSections: 5,
    sectionsCompleted: 0,
  },
  {
    id: 2,
    key: "infra-development",
    title: "Infra Development",
    description: "Physical infrastructure development and completion metrics",
    points: 250,
    completed: false,
    totalSections: 5,
    sectionsCompleted: 0,
  },
  {
    id: 3,
    key: "ppp-development",
    title: "PPP Development",
    description: "PPP (Public-Private Partnership) projects and initiatives",
    points: 250,
    completed: false,
    totalSections: 4,
    sectionsCompleted: 0,
  },
  {
    id: 4,
    key: "infra-enablers",
    title: "Infra Enablers",
    description:
      "Regulatory and institutional frameworks supporting infrastructure",
    points: 250,
    completed: false,
    totalSections: 6,
    sectionsCompleted: 0,
  },
  {
    id: 5,
    key: "review-submit",
    title: "Review & Preview",
    description: "Review all information and preview your submission",
    points: 0,
    completed: false,
  },
];

export const SECTOR_OPTIONS = [
  "Roads & Bridges",
  "Ports",
  "Shipyards",
  "Inland Waterways",
  "Airports",
  "Railway Tracks (including electrification, signalling, tunnels, viaducts & bridges)",
  "Railway Rolling Stock (including workshops & maintenance facilities)",
  "Railway Terminal Infrastructure (stations & adjoining commercial infrastructure)",
  "Urban Public Transport (excluding road transport rolling stock)",
  "Logistics Infrastructure",
  "Bulk Material Transportation Pipelines",
  "Electricity Generation ",
  "Electricity Transmission",
  "Electricity Distribution",
  "Oil / Gas / LNG Storage Facilities",
  "Energy Storage Systems (ESS)",
  "Solid Waste Management",
  "Water Treatment Plants",
  "Sewage Collection, Treatment & Disposal Systems",
  "Irrigation Infrastructure (dams, canals, embankments, etc.)",
  "Storm Water Drainage Systems",
  "Telecommunication (Fixed Network)",
  "Telecommunication Towers",
  "Telecom Services",
  "Data Centres",
  "Educational Institutions (Capital Stock)",
  "Sports Infrastructure",
  "Hospitals (Capital Stock)",
  "Tourism Infrastructure (3-Star & Above Hotels outside cities > 1 million population; Ropeways & Cable Cars)",
  "Industrial Park Infrastructure (Industrial Parks, Food Parks, Textile Parks, SEZs, Tourism Facilities, Agricultural Markets)",
  "Post-Harvest Storage Infrastructure (Agriculture & Horticulture, including Cold Storage)",
  "Terminal Markets",
  "Soil Testing Laboratories",
  "Cold Chain Infrastructure",
  "Affordable Housing",
  "Affordable Rental Housing Complexes",
  "Exhibition-cum-Convention Centres",
];

export const BOND_TYPE_OPTIONS = ["Municipal", "Green", "Other"];

export const ORGANISATION_TYPE_OPTIONS = [
  "Trust",
  "Society",
  "Corporation",
  "Company",
  "Partnership",
  "Other",
];

export const PROJECT_TYPE_OPTIONS = ["BOT", "BOOT", "HAM", "EPC", "Other"];

export const ASSET_TYPE_OPTIONS = ["Core", "Non-Core", "Other"];

export const OWNERSHIP_OPTIONS = [
  "Asset ownership",
  "Revenue sharing",
  "Management contract",
  "Other",
];

export const MONETIZATION_STATUS_OPTIONS = [
  "Select Status",
  "Completed",
  "In Progress",
  "Planned",
];

export const PROJECT_STATUS_OPTIONS = [
  "Completed",
  "In Progress",
  "Planned",
  "Under Review",
  "Other",
];

export const RATING_OPTIONS = [
  "AAA",
  "AA+",
  "AA",
  "AA-",
  "A+",
  "A",
  "A-",
  "BBB+",
  "BBB",
  "BBB-",
  "BB+",
  "BB",
  "BB-",
  "B+",
  "B",
  "B-",
  "CCC",
  "CC",
  "C",
  "D",
];

export const IMPACT_OPTIONS = [
  // "Capital allocation (INR-CRORE)",
  // "Process efficiency",
  // "Cost reduction",
  // "Time savings",
  // "Other",

  // "Rollout",
  // "Viability",
  // "Tech",
  // "Monitoring",
  // "Capacity",
  // "Other",
  
  "Faster roll out of project",
  "Better viability",
  "Technology adoption",
  "Better project monitoring",
  "Capacity building",
  "Any other",
];

export const TRAINING_TYPE_OPTIONS = ["Select Status", "Online", "Offline"];

export const INVESTMENT_READY_STATUS_OPTIONS = ["Tender", "Bidding", "Other"];
