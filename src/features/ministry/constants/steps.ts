import type { MinistryStep } from "../types";

export const MINISTRY_SUBMISSION_STEPS: MinistryStep[] = [
  {
    id: 1,
    key: "infra-financing",
    title: "Infra Financing",
    description: "Data related to infrastructure financing and budget allocation",
    points: 250,
    completed: false,
    totalSections: 3,
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
    totalSections: 3,
    sectionsCompleted: 0,
  },
  {
    id: 4,
    key: "infra-enablers",
    title: "Infra Enablers",
    description: "Regulatory and institutional frameworks supporting infrastructure",
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

