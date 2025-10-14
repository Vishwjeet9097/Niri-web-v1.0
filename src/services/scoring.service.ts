import { apiService } from './api.service';

export interface ScoreRanking {
  rank: number;
  stateUt: string;
  totalScore: number;
  percentage: number;
  approvedAt: string;
  submissionId: string;
}

export interface ScoreStatistics {
  totalStates: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  scoreDistribution: {
    '90-100': number;
    '80-89': number;
    '70-79': number;
    '60-69': number;
    '50-59': number;
    'Below 50': number;
  };
}

export interface StateScore {
  id: string;
  submissionId: string;
  stateUt: string;
  totalScore: number;
  scoreBreakdown: {
    totalScore: number;
    maxPossibleScore: number;
    percentage: number;
    calculations: Array<{
      indicator: string;
      value: number;
      weight: number;
      score: number;
      maxScore: number;
    }>;
    methodology: string;
  };
  calculationMethodology: string;
  approvedBy: string;
  createdAt: string;
}

class ScoringService {
  /**
   * Get all score rankings
   */
  async getRankings(): Promise<ScoreRanking[]> {
    try {
      return await apiService.getScoreRankings();
    } catch (error) {
      console.error('Error fetching score rankings:', error);
      throw error;
    }
  }

  /**
   * Get score statistics
   */
  async getStatistics(): Promise<ScoreStatistics> {
    try {
      return await apiService.getScoreStatistics();
    } catch (error) {
      console.error('Error fetching score statistics:', error);
      throw error;
    }
  }

  /**
   * Get score for a specific state
   */
  async getStateScore(stateUt: string): Promise<StateScore | null> {
    try {
      return await apiService.getStateScore(stateUt);
    } catch (error) {
      console.error(`Error fetching score for state ${stateUt}:`, error);
      throw error;
    }
  }

  /**
   * Calculate score for a submission
   */
  async calculateScore(submissionId: string): Promise<StateScore> {
    try {
      return await apiService.calculateScore(submissionId);
    } catch (error) {
      console.error(`Error calculating score for submission ${submissionId}:`, error);
      throw error;
    }
  }

  /**
   * Transform API data to match frontend format
   */
  transformRankingData(apiData: ScoreRanking[]) {
    return apiData.map((item, index) => ({
      id: index + 1,
      name: item.stateUt,
      isUserState: item.stateUt === "Maharashtra", // Customize this logic
      totalScore: item.totalScore,
      financing: Math.round((item.totalScore * 0.25)), // Approximate breakdown - will be updated with real data
      development: Math.round((item.totalScore * 0.25)),
      ppp: Math.round((item.totalScore * 0.25)),
      enablers: Math.round((item.totalScore * 0.25)),
      category: this.getCategoryFromScore(item.totalScore),
      categoryRange: this.getCategoryRange(item.totalScore),
      yoyChange: Math.floor(Math.random() * 5) - 2, // Random change for demo
      scorePercent: item.percentage,
      region: this.getRegionFromState(item.stateUt),
      rank: item.rank,
      approvedAt: item.approvedAt
    }));
  }

  /**
   * Get category based on score
   */
  private getCategoryFromScore(score: number): string {
    if (score >= 600) return "Leaders";
    if (score >= 400) return "Performers";
    if (score >= 200) return "Challengers";
    return "Strivers";
  }

  /**
   * Get category range based on score
   */
  private getCategoryRange(score: number): string {
    if (score >= 600) return ">600";
    if (score >= 400) return "400-600 pts";
    if (score >= 200) return "200-400 pts";
    return "<200 pts";
  }

  /**
   * Get region based on state name
   */
  private getRegionFromState(stateName: string): string {
    const regionMap: Record<string, string> = {
      "Gujarat": "West",
      "Maharashtra": "West",
      "Tamil Nadu": "South",
      "Karnataka": "South",
      "Himachal Pradesh": "North",
      "Uttar Pradesh": "North",
      "Ministry of Defence": "Central"
    };
    return regionMap[stateName] || "Other";
  }

  /**
   * Get detailed score breakdown for display
   */
  getScoreBreakdown(scoreData: StateScore) {
    const { scoreBreakdown } = scoreData;
    
    return {
      totalScore: scoreBreakdown.totalScore,
      maxPossibleScore: scoreBreakdown.maxPossibleScore,
      percentage: scoreBreakdown.percentage,
      categoryScores: {
        financing: this.getCategoryScore(scoreBreakdown.calculations, 'financing'),
        development: this.getCategoryScore(scoreBreakdown.calculations, 'development'),
        ppp: this.getCategoryScore(scoreBreakdown.calculations, 'ppp'),
        enablers: this.getCategoryScore(scoreBreakdown.calculations, 'enablers')
      },
      methodology: scoreBreakdown.methodology,
      calculations: scoreBreakdown.calculations
    };
  }

  /**
   * Get score for a specific category
   */
  private getCategoryScore(calculations: any[], category: string): number {
    // This is a simplified implementation
    // You might need to adjust based on your actual calculation structure
    const categoryCalculations = calculations.filter(calc => 
      calc.indicator.toLowerCase().includes(category.toLowerCase())
    );
    
    return categoryCalculations.reduce((sum, calc) => sum + calc.score, 0);
  }
}

export const scoringService = new ScoringService();
