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
    description: "Public-Private Partnership projects and initiatives",
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
    title: "Review & Submit",
    description: "Review all information before final submission",
    points: 0,
    completed: false,
  },
];

export const SECTOR_OPTIONS = [
  "Roads & Bridges",
  "Water Supply",
  "Sanitation",
  "Urban Transport",
  "Energy",
  "Health",
  "Education",
  "Other",
];

export const BOND_TYPE_OPTIONS = [
  "Municipal bond",
  "State bond",
  "Green bond",
  "Other",
];

export const ORGANISATION_TYPE_OPTIONS = [
  "Corporation",
  "Trust",
  "Society",
  "Partnership",
  "Other",
];

export const PROJECT_TYPE_OPTIONS = ["BOT", "BOOT", "HAM", "EPC", "Other"];

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
  "Other",
];

export const IMPACT_OPTIONS = [
  "Capital allocation (INR)",
  "Process efficiency",
  "Cost reduction",
  "Time savings",
  "Other",
];

export const TRAINING_TYPE_OPTIONS = [
  "Select Status",
  "Technical",
  "Management",
  "Leadership",
  "Other",
];
