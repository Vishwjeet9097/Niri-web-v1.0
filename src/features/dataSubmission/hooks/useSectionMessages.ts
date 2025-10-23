import { useState, useEffect, useCallback } from "react";
import { apiService } from "@/services/api.service";
import { useToast } from "@/hooks/use-toast";

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
    console.log("🔍 useSectionMessages - submissionData:", submissionData);

    if (submissionData && typeof submissionData === "object") {
      const data = submissionData as Record<string, unknown>;
      console.log("🔍 useSectionMessages - data keys:", Object.keys(data));

      // Update current submission state
      setCurrentSubmission(submissionData);

      // Check if indicatorComment exists and is an object
      if (data.indicatorComment && typeof data.indicatorComment === "object") {
        const indicatorComments = data.indicatorComment as SectionMessages;
        console.log(
          "🔍 Initializing messages from indicatorComment:",
          indicatorComments
        );
        console.log(
          "🔍 Section 1.5 comments from init:",
          indicatorComments["1.5"]
        );
        setMessages(indicatorComments);
      } else {
        console.log("🔍 No indicatorComment found in submissionData");
      }
    } else {
      console.log("🔍 submissionData is not an object or is null/undefined");
    }
  }, [submissionData]);

  // Also listen for changes in the submission prop (for real-time updates)
  useEffect(() => {
    console.log(
      "🔍 useSectionMessages - submission prop changed:",
      submissionData
    );

    if (submissionData && typeof submissionData === "object") {
      const data = submissionData as Record<string, unknown>;

      if (data.indicatorComment && typeof data.indicatorComment === "object") {
        const indicatorComments = data.indicatorComment as SectionMessages;
        console.log(
          "🔍 Updating messages from submission prop:",
          indicatorComments
        );
        console.log(
          "🔍 Section 1.5 comments from submission prop:",
          indicatorComments["1.5"]
        );
        setMessages(indicatorComments);
      } else {
        console.log("🔍 No indicatorComment in submission prop");
      }
    } else {
      console.log("🔍 submissionData is not an object or is null/undefined");
    }
  }, [submissionData]);

  // Update allComments whenever messages change
  useEffect(() => {
    const allCommentsArray: SectionComment[] = [];
    Object.values(messages).forEach((sectionComments) => {
      allCommentsArray.push(...sectionComments);
    });
    console.log("🔍 Updating allComments state:", allCommentsArray);
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
            console.log(
              "🔍 Updating messages from API response:",
              indicatorComments
            );
            console.log("🔍 Section 1.5 comments:", indicatorComments["1.5"]);
            setMessages(indicatorComments);
          } else {
            console.log("🔍 No indicatorComment in API response");
          }
        } else {
          console.log("🔍 Invalid API response:", updatedSubmission);
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
      console.log(`🔍 getComments for ${sectionId}:`, sectionComments);
      return sectionComments;
    },
    [messages]
  );

  const getAllComments = useCallback(() => {
    console.log(
      "🔍 getAllComments - Returning allComments state:",
      allComments
    );
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
