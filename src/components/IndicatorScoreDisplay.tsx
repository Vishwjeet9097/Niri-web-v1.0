import React, { useState, useEffect } from "react";
import { useIndicatorScore } from "./IndicatorScoreToggle";
import { apiService } from "@/services/api.service";
import { getLatestMinistryManualScoreUpdate } from "@/services/ministry.service";

interface IndicatorScoreDisplayProps {
  submissionId: string;
  indicatorCode: string;
  toggleState: "score" | "updatedScore";
  submissionType?: "state" | "ministry"; // Add submission type prop
}

interface ManualScoreUpdate {
  id: string;
  manualUpdatedScore: number;
  systemScore: number;
  maxScore: number;
  updateReason: string;
  createdAt: string;
}

export const IndicatorScoreDisplay: React.FC<IndicatorScoreDisplayProps> = ({
  submissionId,
  indicatorCode,
  toggleState,
  submissionType = "state", // Default to "state" for backward compatibility
}) => {
  const { score: indicatorScore } = useIndicatorScore(submissionId, indicatorCode, submissionType);
  const [latestManualUpdate, setLatestManualUpdate] = useState<ManualScoreUpdate | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch latest manual update when "Updated Score" is selected
  useEffect(() => {
    if (toggleState === "updatedScore" && submissionId && indicatorCode) {
      const fetchLatestUpdate = async () => {
        setLoading(true);
        try {
          const update = submissionType === "ministry"
            ? await getLatestMinistryManualScoreUpdate(submissionId, indicatorCode)
            : await apiService.getLatestManualScoreUpdate(submissionId, indicatorCode);
          setLatestManualUpdate(update);
        } catch (error) {
          console.error(`Error fetching latest manual score update for indicator ${indicatorCode}:`, error);
          setLatestManualUpdate(null);
        } finally {
          setLoading(false);
        }
      };

      fetchLatestUpdate();
    } else {
      setLatestManualUpdate(null);
    }
  }, [toggleState, submissionId, indicatorCode, submissionType]);

  // Show different colors and content based on toggle state
  if (toggleState === "score") {
    // Show actual score when "Score" is selected - Green color scheme
    const displayScore = indicatorScore 
      ? (typeof indicatorScore.score === 'number' 
          ? indicatorScore.score.toFixed(2) 
          : parseFloat(indicatorScore.score || '0').toFixed(2))
      : '0.00';
    
    return (
      <div className="bg-green-100 border border-green-300 rounded-md px-3 py-1.5 flex-shrink-0">
        <span className="text-sm font-semibold text-green-900">
          Score : {displayScore}
        </span>
      </div>
    );
  } else if (toggleState === "updatedScore") {
    // Show latest manual updated score when "Updated Score" is selected - Blue color scheme
    if (loading) {
      return (
        <div className="bg-blue-100 border border-blue-300 rounded-md px-3 py-1.5 flex-shrink-0">
          <span className="text-sm font-semibold text-blue-900">
            Loading...
          </span>
        </div>
      );
    }
    
    if (latestManualUpdate) {
      return (
        <div className="bg-blue-100 border border-blue-300 rounded-md px-3 py-1.5 flex-shrink-0">
          <span className="text-sm font-semibold text-blue-900">
            Updated Score : {latestManualUpdate.manualUpdatedScore}
          </span>
        </div>
      );
    }
    
    // No manual update exists - show empty
    return null;
  }
  
  return null;
};

