export interface MinistryStep {
  id: number;
  key: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  sectionsCompleted?: number;
  totalSections?: number;
}

