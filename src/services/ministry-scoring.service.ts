import { getMinistryScore, calculateMinistryScore } from './ministry.service';

export interface MinistryScoreRanking {
  rank: number;
  ministryId: string;
  ministryName: string;
  totalScore: number;
  percentage: number;
  approvedAt?: string;
  submissionId: string;
  createdAt?: string;
  categoryScores?: {
    infraFinancing: {
      score: number;
      maxScore: number;
      percentage: number;
    };
    infraDevelopment: {
      score: number;
      maxScore: number;
      percentage: number;
    };
    pppDevelopment: {
      score: number;
      maxScore: number;
      percentage: number;
    };
    infraEnablers: {
      score: number;
      maxScore: number;
      percentage: number;
    };
  };
}

export interface MinistryScoreStatistics {
  totalMinistries: number;
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

export interface MinistryScore {
  id: string;
  submissionId: string;
  ministryId: string;
  ministryName: string;
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

class MinistryScoringService {
  /**
   * Get score for a specific ministry submission
   */
  async getMinistryScore(submissionId: string): Promise<MinistryScore | null> {
    try {
      return await getMinistryScore(submissionId);
    } catch (error) {
      console.error(`Error fetching score for ministry submission ${submissionId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate score for a ministry submission
   */
  async calculateScore(submissionId: string): Promise<MinistryScore> {
    try {
      return await calculateMinistryScore(submissionId);
    } catch (error) {
      console.error(`Error calculating score for ministry submission ${submissionId}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed score breakdown for display
   */
  getScoreBreakdown(scoreData: MinistryScore) {
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

  /**
   * Get all ministry score rankings
   */
  async getRankings(): Promise<MinistryScoreRanking[]> {
    try {
      const { apiService } = await import('./api.service');
      const response = await apiService.get('/scoring/ministry/rankings', { withCredentials: true });
      const rankings = response.data?.data !== undefined ? response.data.data : response.data;
      return Array.isArray(rankings) ? rankings : [];
    } catch (error) {
      console.error('Error fetching ministry score rankings:', error);
      throw error;
    }
  }

  /**
   * Get ministry score statistics
   */
  async getStatistics(): Promise<MinistryScoreStatistics> {
    try {
      const { apiService } = await import('./api.service');
      const response = await apiService.get('/scoring/ministry/statistics', { withCredentials: true });
      return response.data?.data !== undefined ? response.data.data : response.data;
    } catch (error) {
      console.error('Error fetching ministry score statistics:', error);
      throw error;
    }
  }

  /**
   * Transform API data to match frontend format
   */
  transformRankingData(apiData: MinistryScoreRanking[], userMinistry?: string) {
    return apiData.map((item, index) => ({
      id: index + 1,
      name: item.ministryName || item.ministryId || 'Unknown Ministry',
      isUserMinistry: userMinistry ? (item.ministryName === userMinistry || item.ministryId === userMinistry) : false,
      totalScore: item.totalScore,
      financing: item.categoryScores?.infraFinancing?.score ?? Math.round((item.totalScore * 0.25)),
      development: item.categoryScores?.infraDevelopment?.score ?? Math.round((item.totalScore * 0.25)),
      ppp: item.categoryScores?.pppDevelopment?.score ?? Math.round((item.totalScore * 0.25)),
      enablers: item.categoryScores?.infraEnablers?.score ?? Math.round((item.totalScore * 0.25)),
      category: this.getCategoryFromScore(item.totalScore),
      categoryRange: this.getCategoryRange(item.totalScore),
      scorePercent: item.percentage,
      rank: item.rank,
      approvedAt: item.approvedAt || item.createdAt
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
}

export const ministryScoringService = new MinistryScoringService();

