import { toast } from "@/hooks/use-toast";
import { storageService } from "@/services/storage.service";

const STORAGE_KEY = "submission_form_data";

export const saveDraftToLocalStorage = (stepKey: string, data: any) => {
  try {
    // Get existing form data
    const existingData = storageService.get(STORAGE_KEY) || {};
    
    // Update with new data
    const updatedData = {
      ...existingData,
      [stepKey]: data,
    };
    
    // Save to localStorage only (NO backend API call)
    storageService.set(STORAGE_KEY, updatedData);
    
    // Show success toast
    toast({
      title: "Draft Saved Successfully",
      description: "Your data has been saved to draft successfully.",
      duration: 2000,
    });
    
    console.log(`💾 Draft saved locally for ${stepKey}:`, data);
    return true;
  } catch (error) {
    console.error("Failed to save draft:", error);
    
    // Show error toast
    toast({
      title: "Save Failed",
      description: "Failed to save draft. Please try again.",
      variant: "destructive",
      duration: 3000,
    });
    
    return false;
  }
};
