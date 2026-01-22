import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit2, Clock } from "lucide-react";
import { apiService } from "@/services/api.service";
import { 
  getMinistryIndicatorScore, 
  getLatestMinistryManualScoreUpdate,
  getMinistryManualScoreUpdateHistory,
  saveMinistryManualScoreUpdate
} from "@/services/ministry.service";

interface EditScoreButtonProps {
  submissionId: string;
  indicatorCode: string;
  mospiStatus?: string | null; // "ACCEPTED" | "ACCEPTED_BY_MOSPI" | "REVERTED" | null
  onScoreUpdated?: () => void;
  submissionType?: "state" | "ministry"; // Add submission type prop
}

interface IndicatorScore {
  indicatorCode: string;
  score: number;
  maxScore: number;
  calculation?: any;
}

interface ManualScoreUpdate {
  id: string;
  systemScore: number;
  manualUpdatedScore: number;
  maxScore: number;
  updateReason: string;
  updatedBy: string;
  createdAt: string;
}

export const EditScoreButton: React.FC<EditScoreButtonProps> = ({
  submissionId,
  indicatorCode,
  mospiStatus,
  onScoreUpdated,
  submissionType = "state", // Default to "state" for backward compatibility
}) => {
  const [open, setOpen] = useState(false);
  const [indicatorScore, setIndicatorScore] = useState<IndicatorScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatedScore, setUpdatedScore] = useState<string>("");
  const [updateReason, setUpdateReason] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [manualUpdateHistory, setManualUpdateHistory] = useState<ManualScoreUpdate[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("edit");

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

  // Fetch current score and latest manual update when modal opens
  useEffect(() => {
    if (open && submissionId && indicatorCode) {
      const fetchData = async () => {
        setLoading(true);
        setError("");
        try {
          // Fetch system score - use ministry API if submissionType is 'ministry', otherwise use state API
          const score = submissionType === "ministry"
            ? await getMinistryIndicatorScore(submissionId, indicatorCode)
            : await apiService.getIndicatorScore(submissionId, indicatorCode);
          
          if (score) {
            setIndicatorScore(score);
          } else {
            setIndicatorScore(null);
          }

          // Fetch latest manual update
          try {
            const latestUpdate = submissionType === "ministry"
              ? await getLatestMinistryManualScoreUpdate(submissionId, indicatorCode)
              : await apiService.getLatestManualScoreUpdate(submissionId, indicatorCode);
            
            if (latestUpdate) {
              // Populate updated score field with latest manual update
              setUpdatedScore(latestUpdate.manualUpdatedScore.toString());
            } else {
              // If no manual update exists, use system score
              setUpdatedScore(score ? score.score.toString() : "0");
            }
          } catch (updateError) {
            console.warn("Could not fetch latest manual update:", updateError);
            // If fetch fails, use system score
            setUpdatedScore(score ? score.score.toString() : "0");
          }
        } catch (error: any) {
          console.error(`Error fetching score for indicator ${indicatorCode}:`, error);
          setError("Failed to load current score");
          setIndicatorScore(null);
          setUpdatedScore("0");
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [open, submissionId, indicatorCode, submissionType]);

  // Fetch manual update history when modal opens
  useEffect(() => {
    if (open && submissionId && indicatorCode) {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const history = submissionType === "ministry"
            ? await getMinistryManualScoreUpdateHistory(submissionId, indicatorCode)
            : await apiService.getManualScoreUpdateHistory(submissionId, indicatorCode);
          setManualUpdateHistory(Array.isArray(history) ? history : []);
        } catch (error) {
          console.error("Error fetching manual update history:", error);
          setManualUpdateHistory([]);
        } finally {
          setLoadingHistory(false);
        }
      };

      fetchHistory();
    } else {
      setManualUpdateHistory([]);
    }
  }, [open, submissionId, indicatorCode, submissionType]);

  const handleSave = async () => {
    if (!indicatorScore) return;

    const scoreValue = parseFloat(updatedScore);
    
    // Frontend validation: Check if score is a valid number
    if (isNaN(scoreValue)) {
      setError("Please enter a valid score");
      return;
    }

    // Frontend validation: Check if score is negative
    if (scoreValue < 0) {
      setError("Score cannot be negative");
      return;
    }

    // Frontend validation: Check if score exceeds maximum
    if (scoreValue > indicatorScore.maxScore) {
      setError(`Updated score (${scoreValue}) cannot exceed maximum score (${indicatorScore.maxScore})`);
      return;
    }

    // Frontend validation: Check if reason is provided
    if (!updateReason.trim()) {
      setError("Please provide a reason for updating the score");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Determine category based on indicator code
      const category = indicatorCode.startsWith('1.') ? 'infraFinancing' :
                       indicatorCode.startsWith('2.') ? 'infraDevelopment' :
                       indicatorCode.startsWith('3.') ? 'pppDevelopment' :
                       indicatorCode.startsWith('4.') ? 'infraEnablers' : '';

      if (!category) {
        throw new Error(`Unable to determine category for indicator ${indicatorCode}`);
      }

      // Call API to save manual score update - use ministry API if submissionType is 'ministry', otherwise use state API
      if (submissionType === "ministry") {
        await saveMinistryManualScoreUpdate(
          submissionId,
          indicatorCode,
          category,
          scoreValue,
          indicatorScore.maxScore,
          updateReason.trim()
        );
      } else {
        await apiService.saveManualScoreUpdate(
          submissionId,
          indicatorCode,
          category,
          scoreValue,
          indicatorScore.maxScore,
          updateReason.trim()
        );
      }

      // Refresh history
      const history = submissionType === "ministry"
        ? await getMinistryManualScoreUpdateHistory(submissionId, indicatorCode)
        : await apiService.getManualScoreUpdateHistory(submissionId, indicatorCode);
      setManualUpdateHistory(Array.isArray(history) ? history : []);
      
      // Clear the form fields after successful save
      setUpdatedScore("");
      setUpdateReason("");

      // Close modal and notify parent
      setOpen(false);
      if (onScoreUpdated) {
        onScoreUpdated();
      }
    } catch (error: any) {
      console.error("Error updating score:", error);
      
      // Handle API error messages
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          "Failed to update score. Please try again.";
      
      // Check if it's a validation error about max score
      if (errorMessage.includes("cannot exceed maximum score") || 
          errorMessage.includes("exceed maximum")) {
        setError(errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setError("");
      setUpdateReason("");
      setUpdatedScore(""); // Clear updated score when modal closes
      // Reset to appropriate tab based on mospiStatus
      const upperStatus = mospiStatus?.toUpperCase() || "";
      const isAcceptedStatus = upperStatus === "ACCEPTED" || upperStatus === "ACCEPTED_BY_MOSPI";
      setActiveTab(isAcceptedStatus ? "history" : "edit");
    } else {
      // When opening, set to history tab if accepted
      const upperStatus = mospiStatus?.toUpperCase() || "";
      const isAcceptedStatus = upperStatus === "ACCEPTED" || upperStatus === "ACCEPTED_BY_MOSPI";
      if (isAcceptedStatus) {
        setActiveTab("history");
      }
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return dateString;
    }
  };

  if (!isMospiApprover) {
    return null;
  }

  // When ACCEPTED_BY_MOSPI, show view-only mode
  // Check for both "ACCEPTED" (for state) and "ACCEPTED_BY_MOSPI" (for ministry)
  const upperStatus = mospiStatus?.toUpperCase() || "";
  const isAccepted = upperStatus === "ACCEPTED" || upperStatus === "ACCEPTED_BY_MOSPI";

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={isAccepted 
          ? "h-6 w-6 p-0 hover:bg-gray-100 cursor-pointer" 
          : "h-6 w-6 p-0 hover:bg-gray-100"
        }
        onClick={() => {
          setOpen(true);
          // If ACCEPTED, open directly to History tab
          if (isAccepted) {
            setActiveTab("history");
          }
        }}
        title={isAccepted ? "View Score History" : "Edit Score"}
      >
        {isAccepted ? (
          <Clock className="h-3.5 w-3.5 text-gray-500" />
        ) : (
          <Edit2 className="h-3.5 w-3.5 text-gray-600" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isAccepted ? `Score History - Indicator ${indicatorCode}` : `Edit Score - Indicator ${indicatorCode}`}
            </DialogTitle>
            <DialogDescription>
              {isAccepted 
                ? "View the score history for this indicator. Editing is disabled for accepted indicators."
                : "Update the score for this indicator. The score cannot exceed the maximum score."}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-4 text-center text-sm text-gray-500">Loading current score...</div>
          ) : indicatorScore ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {!isAccepted && (
                <TabsList className="grid w-full grid-cols-2 h-auto">
                  <TabsTrigger 
                    value="edit" 
                    className="flex items-center justify-center"
                  >
                    Edit Score
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center justify-center">
                    <Clock className="w-4 h-4 mr-1.5" />
                    History ({manualUpdateHistory.length})
                  </TabsTrigger>
                </TabsList>
              )}
              {isAccepted && (
                <TabsList className="grid w-full grid-cols-1 h-auto">
                  <TabsTrigger value="history" className="flex items-center justify-center">
                    <Clock className="w-4 h-4 mr-1.5" />
                    History ({manualUpdateHistory.length})
                  </TabsTrigger>
                </TabsList>
              )}

              {!isAccepted && (
                <TabsContent value="edit" className="mt-4">
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="current-score">System Generated Score</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="current-score"
                          value={`${indicatorScore.score} / ${indicatorScore.maxScore}`}
                          disabled
                          className="bg-gray-50"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="updated-score">Updated Score</Label>
                      <Input
                        id="updated-score"
                        type="number"
                        min="0"
                        max={indicatorScore.maxScore}
                        step="0.01"
                        value={updatedScore}
                        onChange={(e) => {
                          const value = e.target.value;
                          setUpdatedScore(value);
                          setError("");
                          
                          // Real-time validation: Check if value exceeds max score
                          const numValue = parseFloat(value);
                          if (value && !isNaN(numValue) && numValue > indicatorScore.maxScore) {
                            setError(`Updated score cannot exceed maximum score of ${indicatorScore.maxScore}`);
                          } else if (value && !isNaN(numValue) && numValue < 0) {
                            setError("Score cannot be negative");
                          } else {
                            setError("");
                          }
                        }}
                        placeholder="Enter new score"
                      />
                      <p className="text-xs text-gray-500">
                        Maximum score: {indicatorScore.maxScore}
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="update-reason">Reason for Update <span className="text-red-500">*</span></Label>
                      <Textarea
                        id="update-reason"
                        value={updateReason}
                        onChange={(e) => {
                          setUpdateReason(e.target.value);
                          setError("");
                        }}
                        placeholder="Enter the reason for updating this score..."
                        rows={3}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-500">
                        Please provide a clear reason for updating the score
                      </p>
                    </div>

                    {error && (
                      <div className="rounded-md bg-red-50 border border-red-200 p-2">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              <TabsContent value="history" className="mt-4">
                <div className="py-4">
                  {loadingHistory ? (
                    <div className="text-center text-sm text-gray-500 py-4">
                      Loading history...
                    </div>
                  ) : manualUpdateHistory.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 py-8">
                      No manual score updates found for this indicator.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {manualUpdateHistory.map((update, index) => (
                        <div
                          key={update.id}
                          className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-700">
                                Update #{manualUpdateHistory.length - index}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDateTime(update.createdAt)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">System Score</p>
                              <p className="text-sm font-medium text-gray-700">
                                {update.systemScore}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Updated Score</p>
                              <p className="text-sm font-medium text-blue-600">
                                {update.manualUpdatedScore}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 mb-1">Reason</p>
                            <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                              {update.updateReason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="py-4 text-center text-sm text-red-500">
              {error || "No score found for this indicator"}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              {isAccepted ? "Close" : "Cancel"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isAccepted || loading || saving || !indicatorScore || activeTab !== "edit"}
            >
              {saving ? "Saving..." : "Save Score"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

