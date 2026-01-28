import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download, X } from "lucide-react";
import {
  parseMinistryCapacityBuildingExcel,
  generateMinistryCapacityBuildingTemplate,
} from "@/utils/excelParser";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CapacityBuildingEntry {
  id: string;
  officerName: string;
  designation: string;
  programName: string;
  organiser: string;
  trainingType: string;
  trainingPeriod: string; // MM/YY format
}

interface CapacityBuildingExcelUploadProps {
  capacityArray: CapacityBuildingEntry[];
  onUpdateCapacityArray: (entries: CapacityBuildingEntry[]) => void;
  disabled?: boolean;
  sectionStatus?: string | null;
  isEditable?: boolean; // New prop to indicate if section is in edit mode
}

export const CapacityBuildingExcelUpload: React.FC<
  CapacityBuildingExcelUploadProps
> = ({ capacityArray, onUpdateCapacityArray, disabled = false, sectionStatus, isEditable = false }) => {
  // Check if Excel upload should be enabled based on status
  // Only allow when status is null, DRAFT, or RETURNED_FROM_MOSPI
  // BUT: If component is editable (isEditable=true), enable buttons regardless of status
  const upperStatus = sectionStatus?.toUpperCase() || "";
  const isExcelUploadAllowedByStatus = 
    !sectionStatus || 
    upperStatus === "DRAFT" || 
    upperStatus === "RETURNED_FROM_MOSPI" ||
    upperStatus === "RETURNED_FROM_MOSPI_APPROVER" ||
    upperStatus === "RETURNED_FROM_MOSPI_APPROVER_DRAFT";
  
  // Enable Excel buttons if: section is editable OR status allows it
  // But still respect the disabled prop
  const isExcelDisabled = disabled || (!isEditable && !isExcelUploadAllowedByStatus);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);

  const handleExcelUploadClick = () => {
    // Reset input value before opening file dialog
    // This ensures that selecting the same file again will trigger onChange
    if (excelFileInputRef.current) {
      excelFileInputRef.current.value = "";
    }
    excelFileInputRef.current?.click();
  };

  const handleDownloadTemplate = () => {
    try {
      generateMinistryCapacityBuildingTemplate();
      toast({
        title: "Template Downloaded",
        description:
          "Excel template has been downloaded. Please fill it with your data and upload it.",
      });
    } catch (error) {
      console.error("Error generating template:", error);
      toast({
        title: "Error",
        description: "Failed to generate template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExcelUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      // User cancelled file selection - input already reset in handleExcelUploadClick
      return;
    }

    setIsUploadingExcel(true);

    try {
      const result = await parseMinistryCapacityBuildingExcel(file);

      if (!result.success) {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to parse Excel file",
          variant: "destructive",
        });
        return;
      }

      if (result.data && result.data.length > 0) {
        console.log("📊 Excel parsed data:", result.data);
        console.log("📊 Current capacityArray:", capacityArray);
        
        // Add new entries from Excel to existing entries
        // Excel parser generates new UUIDs each time, so all entries are considered new
        // Merge: keep existing entries + add new Excel entries
        // The mapping will happen in DynamicFormBuilder's onUpdateCapacityArray callback
        const finalEntries = [...capacityArray, ...result.data];

        console.log("📊 Existing entries count:", capacityArray.length);
        console.log("📊 New entries from Excel:", result.data.length);
        console.log("📊 Final array (merged, before mapping):", finalEntries);
        console.log("📊 Total entries after merge:", finalEntries.length);
        console.log("📊 Sample Excel entry structure:", result.data[0]);
        console.log("📊 Sample existing entry structure:", capacityArray[0]);
        
        // Add new entries to existing ones
        // Note: onUpdateCapacityArray will map Excel entries to form field IDs
        onUpdateCapacityArray(finalEntries);

        toast({
          title: "Upload Successful",
          description: `Successfully added ${result.data.length} new officer entry/entries from Excel. Total entries: ${finalEntries.length}.`,
        });

        // Show warnings if any
        if (result.warnings && result.warnings.length > 0) {
          console.warn("Excel upload warnings:", result.warnings);
          toast({
            title: "Upload Completed with Warnings",
            description: `Some rows were skipped. Check console for details.`,
            variant: "default",
          });
        }
      } else {
        toast({
          title: "No Data Found",
          description: "Excel file contains no valid data rows.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error uploading Excel:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload Excel file",
        variant: "destructive",
      });
    } finally {
      setIsUploadingExcel(false);
      // Reset input value after processing completes (success or error)
      // This ensures the same file can be selected again
      if (excelFileInputRef.current) {
        excelFileInputRef.current.value = "";
      }
    }
  };

  const handleClearAll = () => {
    onUpdateCapacityArray([]);
    setShowClearAllDialog(false);
    toast({
      title: "Cleared",
      description: "All officer entries have been cleared.",
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExcelUploadClick}
          disabled={isExcelDisabled || isUploadingExcel}
          className="w-fit border-green-600 text-green-600 hover:bg-green-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4" />
          {isUploadingExcel ? "Uploading..." : "Upload Excel"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownloadTemplate}
          disabled={isExcelDisabled}
          className="w-fit border-blue-600 text-blue-600 hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Download Template
        </Button>

        {capacityArray.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowClearAllDialog(true)}
            disabled={isExcelDisabled}
            className="w-fit border-red-600 text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            Clear All
          </Button>
        )}

        <input
          ref={excelFileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleExcelUpload}
          style={{ display: "none" }}
        />
      </div>

      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Entries?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all {capacityArray.length} officer
              entries? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

