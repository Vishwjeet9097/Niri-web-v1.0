import { useState, useEffect, useCallback } from "react";
import { storageService } from "@/services/storage.service";

interface SectionMessages {
  [sectionId: string]: string;
}

const getStorageKey = (submissionId: string) => 
  `section_messages_${submissionId}`;

export const useSectionMessages = (submissionId: string) => {
  const [messages, setMessages] = useState<SectionMessages>(() => {
    const saved = storageService.get<SectionMessages>(
      getStorageKey(submissionId)
    );
    return saved || {};
  });

  useEffect(() => {
    storageService.set(getStorageKey(submissionId), messages);
  }, [messages, submissionId]);

  const saveMessage = useCallback((sectionId: string, message: string) => {
    setMessages((prev) => ({
      ...prev,
      [sectionId]: message,
    }));
  }, []);

  const getMessage = useCallback(
    (sectionId: string) => {
      return messages[sectionId] || "";
    },
    [messages]
  );

  const clearMessages = useCallback(() => {
    storageService.remove(getStorageKey(submissionId));
    setMessages({});
  }, [submissionId]);

  return {
    saveMessage,
    getMessage,
    clearMessages,
  };
};
