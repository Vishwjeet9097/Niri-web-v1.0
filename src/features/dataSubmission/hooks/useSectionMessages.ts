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
