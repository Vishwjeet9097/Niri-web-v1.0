import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiService } from "@/services/api.service";
import { EditScoreButton } from "./EditScoreButton";

interface IndicatorScoreToggleProps {
  submissionId: string;
  indicatorCode: string;
  onScoreChange?: (score: number | null, maxScore: number | null) => void;
  onToggleChange?: (state: "score" | "updatedScore") => void;
  controlledToggleState?: "score" | "updatedScore";
  showLabel?: boolean;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
  mospiStatus?: string | null; // "ACCEPTED" | "REVERTED" | null
}

interface IndicatorScore {
  indicatorCode: string;
  score: number;
  maxScore: number;
  calculation?: any;
}

export const IndicatorScoreToggle: React.FC<IndicatorScoreToggleProps> = ({
  submissionId,
  indicatorCode,
  onScoreChange,
  onToggleChange,
  controlledToggleState,
  showLabel = true,
  size = "sm",
  variant = "outline",
  mospiStatus,
}) => {
  const [internalToggleState, setInternalToggleState] = useState<"score" | "updatedScore">("score");
  const toggleState = controlledToggleState ?? internalToggleState;
  const [indicatorScore, setIndicatorScore] = useState<IndicatorScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasUpdatedScore, setHasUpdatedScore] = useState(false);

  // Check if user is MOSPI_APPROVER
  const isMospiApprover = React.useMemo(() => {
    try {
      const authUser = localStorage.getItem("niri_app:auth_user");
      if (authUser) {
        const user = JSON.parse(authUser);
        const role = user.value?.role;
        return role === "MOSPI_APPROVER";
      }
    } catch (error) {
      console.error("Error reading user role:", error);
    }
    return false;
  }, []);

  // Fetch indicator score and check for updated score
  useEffect(() => {
    if (!isMospiApprover || !submissionId || !indicatorCode) return;

    const fetchScoreAndHistory = async () => {
      setLoading(true);
      try {
        // Fetch current score
        const score = await apiService.getIndicatorScore(submissionId, indicatorCode);
        if (score) {
          setIndicatorScore(score);
          // Notify parent component about the score
          if (onScoreChange && toggleState === "score") {
            onScoreChange(score.score, score.maxScore);
          }
        } else {
          setIndicatorScore(null);
          if (onScoreChange) {
            onScoreChange(null, null);
          }
        }

        // Check if there's a manual score update (indicating an updated score exists)
        try {
          const latestManualUpdate = await apiService.getLatestManualScoreUpdate(submissionId, indicatorCode);
          // If manual update exists, allow toggling to "Updated Score"
          setHasUpdatedScore(!!latestManualUpdate);
        } catch (updateError) {
          // If manual update fetch fails, assume no updated score
          console.warn(`Could not fetch manual score update for indicator ${indicatorCode}:`, updateError);
          setHasUpdatedScore(false);
        }
      } catch (error) {
        console.error(`Error fetching score for indicator ${indicatorCode}:`, error);
        setIndicatorScore(null);
        setHasUpdatedScore(false);
        if (onScoreChange) {
          onScoreChange(null, null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchScoreAndHistory();
  }, [submissionId, indicatorCode, isMospiApprover, onScoreChange, toggleState]);

  // Don't render if not MOSPI_APPROVER (role-specific only)
  if (!isMospiApprover) {
    return null;
  }

  // Convert toggle state to boolean for Switch component
  // When handle is on left (unchecked = false): "Score" is active (green, bold)
  // When handle is on right (checked = true): "Updated Score" is active (blue, bold)
  const isChecked = toggleState === "updatedScore";

  const handleToggleChange = (checked: boolean) => {
    // Prevent switching to "updatedScore" if no updated score exists
    // But always allow switching back to "score" (unchecked)
    if (checked && !hasUpdatedScore) {
      // Prevent the toggle - don't update state
      return;
    }

    // When checked (handle right) = "updatedScore", when unchecked (handle left) = "score"
    const newState: "score" | "updatedScore" = checked ? "updatedScore" : "score";
    
    if (controlledToggleState === undefined) {
      setInternalToggleState(newState);
    }
    
    if (onToggleChange) {
      onToggleChange(newState);
    }
    
    // Notify parent about score change
    if (onScoreChange) {
      if (!checked && indicatorScore) {
        // When unchecked (handle left), "Score" is active - show score
        onScoreChange(indicatorScore.score, indicatorScore.maxScore);
      } else {
        // When checked (handle right), "Updated Score" is active - show empty/null
        onScoreChange(null, null);
      }
    }
  };

  // Calculate display score based on toggle state
  const displayScore = toggleState === "score" && indicatorScore
    ? `${indicatorScore.score}/${indicatorScore.maxScore}`
    : null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <Label
          htmlFor={`score-toggle-${indicatorCode}`}
          className={`text-sm cursor-pointer transition-colors ${
            !isChecked 
              ? "font-semibold text-gray-900" 
              : "text-gray-500"
          }`}
        >
          Score
        </Label>
        <Switch
          id={`score-toggle-${indicatorCode}`}
          checked={isChecked}
          onCheckedChange={handleToggleChange}
          className="data-[state=checked]:!bg-blue-500 data-[state=unchecked]:!bg-green-500"
        />
        <div className="flex items-center gap-1">
          <Label
            htmlFor={`score-toggle-${indicatorCode}`}
            className={`text-sm cursor-pointer transition-colors ${
              isChecked 
                ? "font-semibold text-gray-900" 
                : "text-gray-500"
            }`}
          >
            Updated Score
          </Label>
          <EditScoreButton
            submissionId={submissionId}
            indicatorCode={indicatorCode}
            mospiStatus={mospiStatus}
            onScoreUpdated={() => {
              // Refresh the manual score update status
              apiService.getLatestManualScoreUpdate(submissionId, indicatorCode)
                .then((update) => {
                  setHasUpdatedScore(!!update);
                })
                .catch((error) => {
                  console.error("Error refreshing manual score update:", error);
                });
            }}
          />
        </div>
      </div>
      
      {showLabel && displayScore && (
        <span className="text-sm font-semibold text-gray-700">
          Score: {displayScore}
        </span>
      )}
    </div>
  );
};

// Export a hook to get the current score for display
export const useIndicatorScore = (
  submissionId: string,
  indicatorCode: string
): { score: IndicatorScore | null; loading: boolean } => {
  const [indicatorScore, setIndicatorScore] = useState<IndicatorScore | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!submissionId || !indicatorCode) return;

    const fetchScore = async () => {
      setLoading(true);
      try {
        const score = await apiService.getIndicatorScore(submissionId, indicatorCode);
        setIndicatorScore(score || null);
      } catch (error) {
        console.error(`Error fetching score for indicator ${indicatorCode}:`, error);
        setIndicatorScore(null);
      } finally {
        setLoading(false);
      }
    };

    fetchScore();
  }, [submissionId, indicatorCode]);

  return { score: indicatorScore, loading };
};

