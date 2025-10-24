import { useState, useEffect, useCallback } from "react";
import { apiService } from "@/services/api.service";
import { useToast } from "@/hooks/use-toast";
import { storageService } from "@/services/storage.service";

interface SectionComment {
  role: string;
  text: string;
  type: string;
  userId: string;
  sectionId: string;
  timestamp: string;
}

interface SectionMessages {
  [sectionId: string]: SectionComment[];
}

export const useSectionMessages = (
  submissionId: string,
  submissionData?: unknown
) => {
  const [messages, setMessages] = useState<SectionMessages>({});
  const [allComments, setAllComments] = useState<SectionComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState(submissionData);
  const { toast } = useToast();

  // Initialize messages from submission data
  useEffect(() => {
    // Debug logging removed for performance

    if (submissionData && typeof submissionData === "object") {
      const data = submissionData as Record<string, unknown>;
      console.log("🔍 useSectionMessages - data keys:", Object.keys(data));

      // Update current submission state
      setCurrentSubmission(submissionData);

      // Check if indicatorComment exists and is an object
      if (data.indicatorComment && typeof data.indicatorComment === "object") {
        const indicatorComments = data.indicatorComment as SectionMessages;
        // Debug logging removed for performance

        // Debug logging removed for performance

        setMessages(indicatorComments);
      } else {
        // Debug logging removed for performance
      }
    } else {
      // Debug logging removed for performance
    }
  }, [submissionData]);

  // Real-time update listener for comments
  useEffect(() => {
    const handleCommentUpdate = async (event: CustomEvent) => {
      console.log("🔍 Event received:", event);
      console.log("🔍 Event detail:", event.detail);

      const { submissionId: eventSubmissionId, comments } = event.detail;
      console.log("🔍 Event submissionId:", eventSubmissionId);
      console.log("🔍 Current submissionId:", submissionId);
      console.log("🔍 IDs match:", eventSubmissionId === submissionId);

      if (eventSubmissionId === submissionId) {
        console.log("🔄 Real-time comment update received:", comments);

        // 1. Update local state immediately
        setMessages(comments);
        const allCommentsArray = Object.values(comments).flat();
        setAllComments(allCommentsArray);
        console.log("✅ Local state updated immediately");

        // 2. Refresh complete submission data (same as first load)
        try {
          console.log("🔄 Refreshing complete submission data...");
          console.log(
            "🔄 API call: apiService.getSubmission(",
            submissionId,
            ")"
          );

          const freshSubmission = await apiService.getSubmission(submissionId);
          console.log("🔄 API response received:", freshSubmission);

          if (freshSubmission && typeof freshSubmission === "object") {
            const data = freshSubmission as Record<string, unknown>;
            console.log("🔄 Fresh submission data keys:", Object.keys(data));

            // Update current submission state
            setCurrentSubmission(freshSubmission);
            console.log("✅ Current submission state updated");

            // Update messages with fresh data (same as first load)
            if (
              data.indicatorComment &&
              typeof data.indicatorComment === "object"
            ) {
              const indicatorComments =
                data.indicatorComment as SectionMessages;
              console.log("✅ Fresh comments loaded:", indicatorComments);
              console.log(
                "✅ Fresh comments count:",
                Object.keys(indicatorComments).length
              );

              setMessages(indicatorComments);
              const allCommentsArray = Object.values(indicatorComments).flat();
              setAllComments(allCommentsArray);
              console.log("✅ Messages state updated with fresh data");
            } else {
              console.log("⚠️ No indicatorComment in fresh submission");
            }

            console.log("✅ Complete submission data refreshed successfully");
          } else {
            console.log("❌ Fresh submission is null or not an object");
          }
        } catch (error) {
          console.error("❌ Failed to refresh submission data:", error);
        }
      } else {
        console.log("⚠️ Event submissionId doesn't match current submissionId");
      }
    };

    window.addEventListener(
      "niri-comment-updated",
      handleCommentUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "niri-comment-updated",
        handleCommentUpdate as EventListener
      );
    };
  }, [submissionId]);

  // Also listen for changes in the submission prop (for real-time updates)
  useEffect(() => {
    // Debug logging removed for performance

    if (submissionData && typeof submissionData === "object") {
      const data = submissionData as Record<string, unknown>;

      if (data.indicatorComment && typeof data.indicatorComment === "object") {
        const indicatorComments = data.indicatorComment as SectionMessages;
        // Debug logging removed for performance

        // Debug logging removed for performance

        setMessages(indicatorComments);
      } else {
        // Debug logging removed for performance
      }
    } else {
      // Debug logging removed for performance
    }
  }, [submissionData]);

  // Update allComments whenever messages change
  useEffect(() => {
    const allCommentsArray: SectionComment[] = [];
    Object.values(messages).forEach((sectionComments) => {
      allCommentsArray.push(...sectionComments);
    });
    // Debug logging removed for performance

    setAllComments(allCommentsArray);
  }, [messages]);

  const saveMessage = useCallback(
    async (sectionId: string, message: string) => {
      // Validate parameters
      if (!message || typeof message !== "string") {
        console.error(
          "❌ useSectionMessages - Invalid message parameter:",
          message
        );
        return;
      }

      if (!message.trim()) return;

      setIsLoading(true);
      try {
        const updatedSubmission = await apiService.addComment(
          submissionId,
          message.trim(),
          sectionId,
          "indicator_comment"
        );

        // Update local state with indicatorComment from API response
        if (updatedSubmission && typeof updatedSubmission === "object") {
          const data = updatedSubmission as unknown as Record<string, unknown>;
          console.log("🔍 API Response data keys:", Object.keys(data));

          // Update current submission state
          setCurrentSubmission(updatedSubmission);

          if (
            data.indicatorComment &&
            typeof data.indicatorComment === "object"
          ) {
            const indicatorComments = data.indicatorComment as SectionMessages;
            // Debug logging removed for performance

            // Debug logging removed for performance

            setMessages(indicatorComments);

            // Real-time update: Store in localStorage for persistence
            try {
              localStorage.setItem(
                `niri_comments_${submissionId}`,
                JSON.stringify(indicatorComments)
              );
            } catch (error) {
              console.warn("Failed to cache comments:", error);
            }

            // Real-time update: Trigger custom event for other components
            window.dispatchEvent(
              new CustomEvent("niri-comment-updated", {
                detail: {
                  submissionId,
                  sectionId,
                  comments: indicatorComments,
                  timestamp: new Date().toISOString(),
                },
              })
            );
          } else {
            // Debug logging removed for performance
          }

          // Clear localStorage to prevent stale data issues
          const reviewFormKey = `review_form_data_${submissionId}`;
          storageService.remove(reviewFormKey);
          console.log("🧹 Cleared localStorage to prevent stale data");
        } else {
          // Debug logging removed for performance
        }

        toast({
          title: "Success",
          description: "Comment added successfully",
        });

        return updatedSubmission;
      } catch (error: unknown) {
        console.error("Error saving message:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to save comment";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [submissionId, toast]
  );

  const getMessage = useCallback(
    (sectionId: string) => {
      const sectionComments = messages[sectionId] || [];
      // Return the latest comment text for backward compatibility
      return sectionComments.length > 0
        ? sectionComments[sectionComments.length - 1].text
        : "";
    },
    [messages]
  );

  const getComments = useCallback(
    (sectionId: string) => {
      const sectionComments = messages[sectionId] || [];
      // Debug logging removed for performance

      return sectionComments;
    },
    [messages]
  );

  const getAllComments = useCallback(() => {
    // Debug logging removed for performance

    return allComments;
  }, [allComments]);

  const clearMessages = useCallback(() => {
    setMessages({});
  }, []);

  return {
    saveMessage,
    getMessage,
    getComments,
    getAllComments,
    clearMessages,
    isLoading,
    messages,
  };
};
