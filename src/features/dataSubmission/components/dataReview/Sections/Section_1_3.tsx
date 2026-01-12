import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown, dropdownValues } from "@/utils/getDropDowns";
import { Plus, Check, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import axios from "axios";
import { API_ENDPOINTS } from "@/config/endpoints";
import { FileUploadSection } from "@/features/submission/components/FileUploadSection";

interface Section1_3Props {
  formData: any;
  isEditable: (sectionId: string) => boolean;
  setSectionState?: (state: { totalULBs: number; ulbList: any[] }) => void;
  resetKey?: number;
  validationErrors?: { [key: string]: string };
  getFieldError?: (fieldPath: string) => string | undefined;
  submissionId?: string;
  deferFileDeletion?: boolean; // If true, don't call DELETE API immediately (for editing sent-back indicators)
}

export const Section_1_3 = ({
  formData,
  isEditable,
  setSectionState,
  resetKey,
  validationErrors = {},
  getFieldError,
  submissionId,
  deferFileDeletion = false,
}: Section1_3Props) => {
  // Helper function to extract original name from UUID-prefixed fileName
  const extractOriginalName = (
    fileName: string,
    originalName?: string
  ): string => {
    if (originalName && originalName.trim()) return originalName;

    // UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with hyphens)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;

    if (uuidPattern.test(fileName)) {
      const extracted = fileName.replace(uuidPattern, "");
      if (extracted && extracted.trim().length > 0) {
        return extracted;
      }
    }

    return fileName;
  };

  const getError = (fieldPath: string) => {
    // Check local duplicate errors first, then validation errors
    return (
      duplicateErrors[fieldPath] ||
      (getFieldError ? getFieldError(fieldPath) : validationErrors[fieldPath])
    );
  };

  // Helper function to format date for HTML5 date input (YYYY-MM-DD)
  const formatDateForInput = (dateValue: string | undefined): string => {
    if (!dateValue) return "";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split("T")[0];
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  const ulbList = formData?.section1_3?.ulbList || [];
  const totalULBs = formData?.section1_3?.totalULBs || 0;
  console.log("[Section_1_3] formData:", formData);
  console.log("[Section_1_3] ulbList:", ulbList);
  // Get state name from formData or fallback to logged-in user
  const { user } = useAuth();
  const stateName = user?.state || user?.stateName || "";

  // State for fetched ULBs
  const [ulbDropdownOptions, setUlbDropdownOptions] = useState([]);
  const [ulbLoading, setUlbLoading] = useState(false);
  const [ulbError, setUlbError] = useState("");
  // Fetch ULBs for Maharashtra on mount
  useEffect(() => {
    const fetchULBs = async () => {
      setUlbLoading(true);
      setUlbError("");
      try {
        const url = API_ENDPOINTS.ulb.byState(stateName);
        const res = await axios.get(url);
        console.log("ULB API response:", res.data);
        // API returns { status, data: { total, data: [ ... ] } }
        const ulbArray = res.data?.data?.data || [];
        const options = ulbArray.map((ulb) => {
          // Compose label as 'ulb_name - city_name (ulb_type)'
          const ulbName = ulb.ulb_name || ulb.name || "";
          const cityName = ulb.city_name || ulb.city || "";
          const ulbType = ulb.ulb_type || ulb.type || "";
          let label = ulbName;
          if (cityName) label += ` - ${cityName}`;
          if (ulbType) label += ` (${ulbType})`;
          return {
            label: label,
            value: String(ulb.id), // Ensure value is a string
          };
        });
        console.log("ULB dropdown options:", options);
        setUlbDropdownOptions(options);
      } catch (err) {
        setUlbError("Failed to load ULBs");
        console.error("ULB API error:", err);
      } finally {
        setUlbLoading(false);
      }
    };
    fetchULBs();
  }, [stateName]);

  // State for adding new ULB entry
  const [showAddULBForm, setShowAddULBForm] = useState(false);
  const [newULBEntry, setNewULBEntry] = useState({
    cityName: "",
    ulb: "",
    ratingDate: "",
    rating: "",
    file: null,
    noDocumentAvailable: false,
  });

  // Local state for duplicate validation errors
  const [duplicateErrors, setDuplicateErrors] = useState<{
    [key: string]: string;
  }>({});

  // Reset form when resetKey changes (on cancel)
  useEffect(() => {
    if (resetKey !== undefined && resetKey > 0) {
      setShowAddULBForm(false);
      setNewULBEntry({
        cityName: "",
        ulb: "",
        ratingDate: "",
        rating: "",
        file: null,
        noDocumentAvailable: false,
      });
      setDuplicateErrors({});
    }
  }, [resetKey]);

  // Validate totalULBs vs ulbList.length
  useEffect(() => {
    if (totalULBs > 0 && ulbList.length > totalULBs) {
      // Set validation error
      setDuplicateErrors((prev) => ({
        ...prev,
        "section1_3.ulbList": `Number of rows (${ulbList.length}) cannot exceed Total Number of ULBs (${totalULBs}). Please remove excess rows or increase the Total Number of ULBs.`,
      }));
    } else {
      // Clear error if valid (but keep duplicate errors)
      setDuplicateErrors((prev) => {
        const newErrors: { [key: string]: string } = {};
        Object.keys(prev).forEach((key) => {
          // Keep duplicate errors, clear count-related errors
          if (
            !key.includes("cannot exceed") &&
            !key.includes("Cannot add more rows")
          ) {
            newErrors[key] = prev[key];
          }
        });
        return newErrors;
      });
    }
  }, [totalULBs, ulbList.length]);

  // Validate for duplicate ULBs whenever ulbList changes
  useEffect(() => {
    const ulbIds = ulbList.map((item) => item.ulb).filter(Boolean);
    const duplicates = new Map<string, number[]>();

    // Find duplicate ULB selections
    ulbIds.forEach((ulbId, index) => {
      const indices: number[] = [];
      ulbIds.forEach((id, idx) => {
        if (id === ulbId) {
          indices.push(idx);
        }
      });
      if (indices.length > 1) {
        duplicates.set(ulbId, indices);
      }
    });

    // Update duplicate errors
    setDuplicateErrors((prev) => {
      const newErrors: { [key: string]: string } = {};

      // Set errors for all duplicates (except the first occurrence)
      duplicates.forEach((indices) => {
        indices.forEach((idx, i) => {
          if (i > 0) {
            // Mark all except the first as duplicates
            newErrors[`section1_3.ulbList.${idx}.ulb`] =
              "This ULB has already been selected in another row. Please choose a different ULB.";
          }
        });
      });

      // Preserve count-related errors
      Object.keys(prev).forEach((key) => {
        if (
          key.includes("cannot exceed") ||
          key.includes("Cannot add more rows") ||
          key === "section1_3.ulbList"
        ) {
          newErrors[key] = prev[key];
        }
      });

      // Clear errors for fields that are no longer duplicates
      Object.keys(prev).forEach((key) => {
        if (
          !newErrors[key] &&
          key.includes("section1_3.ulbList") &&
          key.includes(".ulb")
        ) {
          // Keep non-duplicate errors
          const index = parseInt(
            key.match(/section1_3\.ulbList\.(\d+)\.ulb/)?.[1] || "-1"
          );
          if (index >= 0 && index < ulbList.length) {
            const ulbId = ulbList[index].ulb;
            const isStillDuplicate =
              duplicates.has(ulbId) &&
              duplicates
                .get(ulbId)
                ?.some(
                  (idx) => idx !== duplicates.get(ulbId)?.[0] && idx === index
                );
            if (!isStillDuplicate) {
              // Error was cleared, don't include it
            } else {
              newErrors[key] = prev[key];
            }
          }
        }
      });

      return newErrors;
    });
  }, [ulbList]);

  // Update parent state on change
  const handleUlbChange = (index: number, field: string, value: any) => {
    const updatedUlbList = [...ulbList];
    // If ULB is changed, check for duplicates
    if (field === "ulb") {
      const stringValue = value ? String(value) : "";

      // Check if this ULB is already selected in another row
      const isDuplicate = ulbList.some(
        (item, idx) =>
          idx !== index && item.ulb === stringValue && stringValue !== ""
      );

      if (isDuplicate) {
        // Set error for duplicate ULB
        setDuplicateErrors((prev) => ({
          ...prev,
          [`section1_3.ulbList.${index}.ulb`]:
            "This ULB has already been selected in another row. Please choose a different ULB.",
        }));
        return; // Don't update form data
      }

      // Clear duplicate error for this field
      setDuplicateErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`section1_3.ulbList.${index}.ulb`];
        return newErrors;
      });

      const selectedULB = ulbDropdownOptions.find(
        (u) => u.value === stringValue
      );
      // Try to get city name from label (format: ulb_name - city_name (ulb_type))
      let cityName = "";
      if (selectedULB && selectedULB.label) {
        const match = selectedULB.label.match(/-\s([^()]+)(?:\(|$)/);
        if (match && match[1]) {
          cityName = match[1].trim();
        }
      }
      updatedUlbList[index] = {
        ...updatedUlbList[index],
        [field]: stringValue,
        cityName,
      };
    } else {
      updatedUlbList[index] = { ...updatedUlbList[index], [field]: value };
    }
    if (setSectionState) {
      setSectionState({ totalULBs, ulbList: updatedUlbList });
    }
  };

  const handleTotalULBsChange = (value: number) => {
    const newTotalULBs = value || 0;
    let updatedList = [...ulbList];

    // If new total is less than current rows, trim the list
    if (newTotalULBs < ulbList.length) {
      updatedList = ulbList.slice(0, newTotalULBs);
    }
    // If new total is greater than 0 and list is empty, add at least one entry
    else if (newTotalULBs > 0 && ulbList.length === 0) {
      updatedList = [
        {
          id: `ulb-${Date.now()}`,
          cityName: "",
          ulb: "",
          ratingDate: "",
          rating: "",
          file: null,
          noDocumentAvailable: false,
        },
      ];
    }

    // Clear validation error if totalULBs is now valid
    setDuplicateErrors((prev) => {
      const newErrors: { [key: string]: string } = {};
      Object.keys(prev).forEach((key) => {
        // Keep duplicate errors, clear count-related errors
        if (
          !key.includes("Total Number") &&
          !key.includes("cannot exceed") &&
          !key.includes("Cannot add more")
        ) {
          newErrors[key] = prev[key];
        }
      });
      return newErrors;
    });

    if (setSectionState) {
      setSectionState({ totalULBs: newTotalULBs, ulbList: updatedList });
    }
  };

  const handleRemoveULB = (
    idOrIndex: string | number,
    targetIndex?: number
  ) => {
    console.log(
      `[Section_1_3] handleRemoveULB called with idOrIndex:`,
      idOrIndex,
      `targetIndex:`,
      targetIndex
    );
    console.log(`[Section_1_3] Current ulbList:`, ulbList);

    // Clear duplicate errors when removing a ULB
    setDuplicateErrors((prev) => {
      const newErrors: { [key: string]: string } = {};
      // Keep only errors for fields that still exist after deletion
      Object.keys(prev).forEach((key) => {
        if (key.includes("section1_3.ulbList")) {
          const match = key.match(/section1_3\.ulbList\.(\d+)\.ulb/);
          if (match) {
            const errorIndex = parseInt(match[1]);
            // Adjust index if removing an item before this error's index
            if (targetIndex !== undefined && errorIndex > targetIndex) {
              const newIndex = errorIndex - 1;
              newErrors[`section1_3.ulbList.${newIndex}.ulb`] = prev[key];
            } else if (
              targetIndex === undefined ||
              errorIndex !== targetIndex
            ) {
              newErrors[key] = prev[key];
            }
            // If errorIndex === targetIndex, don't include it (item is being deleted)
          } else {
            newErrors[key] = prev[key];
          }
        } else {
          newErrors[key] = prev[key];
        }
      });
      return newErrors;
    });

    // If targetIndex is provided, use index-based deletion (most reliable)
    if (targetIndex !== undefined && targetIndex >= 0) {
      const updatedUlbList = ulbList.filter(
        (ulb, index) => index !== targetIndex
      );
      console.log(
        `[Section_1_3] Updated ulbList (index-based):`,
        updatedUlbList
      );
      if (setSectionState) {
        setSectionState({ totalULBs, ulbList: updatedUlbList });
      }
      return;
    }

    // Otherwise, try ID-based deletion
    const targetId = String(idOrIndex);
    const parsedIndex = parseInt(targetId, 10);
    const isIndex = !isNaN(parsedIndex) && parsedIndex >= 0;

    const updatedUlbList = ulbList.filter((ulb, index) => {
      // If ulb has an id, compare by id AND index to ensure uniqueness
      if (ulb.id !== undefined && ulb.id !== null) {
        const ulbId = String(ulb.id);
        // Match by ID, but also ensure we're matching the correct item by index if provided
        if (ulbId === targetId) {
          // If it's an index-based call, also match by index to ensure we delete the right one
          if (isIndex) {
            return index !== parsedIndex;
          }
          // For ID-only match, delete only the first match to prevent deleting duplicates
          // This is a safety measure - ideally IDs should be unique
          return false; // Delete first match only
        }
        return true; // Keep items with different IDs
      }

      // If no id and target is a valid index, compare by index
      if (isIndex) {
        return index !== parsedIndex;
      }

      // Fallback: keep the ulb if we can't match
      return true;
    });

    console.log(`[Section_1_3] Updated ulbList:`, updatedUlbList);
    if (setSectionState) {
      setSectionState({ totalULBs, ulbList: updatedUlbList });
    }
  };

  // Handle adding new ULB entry
  const handleAddNewULBEntry = () => {
    // Check if we can add more rows
    if (ulbList.length >= totalULBs) {
      // Set validation error
      setDuplicateErrors((prev) => ({
        ...prev,
        "section1_3.ulbList": `Cannot add more rows. Total Number of ULBs is ${totalULBs}, and you already have ${ulbList.length} row(s). Please increase the Total Number of ULBs first.`,
      }));
      return;
    }

    // Clear validation error
    setDuplicateErrors((prev) => {
      const newErrors: { [key: string]: string } = {};
      Object.keys(prev).forEach((key) => {
        if (!key.includes("Cannot add more rows")) {
          newErrors[key] = prev[key];
        }
      });
      return newErrors;
    });

    const newEntryWithId = {
      ...newULBEntry,
      id: `ulb-${Date.now()}`,
    };
    const updatedUlbList = [...ulbList, newEntryWithId];
    console.log("[Section_1_3] Adding new ULB entry:", newEntryWithId);
    console.log("[Section_1_3] Updated ulbList:", updatedUlbList);
    if (setSectionState) {
      setSectionState({ totalULBs, ulbList: updatedUlbList });
    }
    // Reset form
    setNewULBEntry({
      cityName: "",
      ulb: "",
      ratingDate: "",
      rating: "",
      file: null,
      noDocumentAvailable: false,
    });
    setShowAddULBForm(false);
  };

  // Handle cancel adding new ULB entry
  const handleCancelAddULBEntry = () => {
    setNewULBEntry({
      cityName: "",
      ulb: "",
      ratingDate: "",
      rating: "",
      file: null,
      noDocumentAvailable: false,
    });
    setShowAddULBForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Total ULBs Display */}
      <div className="flex gap-4">
        <div className="max-w-xs">
          <Label>Total Number of ULBs</Label>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            value={totalULBs}
            onChange={(e) => {
              const value = e.target.value;
              // Only allow non-negative integers
              if (value === "" || /^\d+$/.test(value)) {
                handleTotalULBsChange(value === "" ? 0 : Number(value));
              }
            }}
            readOnly={!isEditable("1.3")}
            className={isEditable("1.3") ? "bg-white" : "bg-gray-50"}
          />
        </div>
        <div className="max-w-xs">
          <Label>Credit rated ULBs</Label>
          <Input
            type="number"
            value={ulbList.length || 0}
            readOnly
            className="bg-gray-50 cursor-not-allowed"
          />
        </div>
        <div className="max-w-xs">
          <Label>% of Credit Rated ULBs</Label>
          <Input
            type="text"
            value={
              totalULBs > 0
                ? ((ulbList.length / totalULBs) * 100).toFixed(2) + "%"
                : "0%"
            }
            readOnly
            className="bg-gray-50 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Validation error for ulbList */}
      {getError("section1_3.ulbList") && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-500">
            {getError("section1_3.ulbList")}
          </p>
        </div>
      )}

      {/* ULB Table */}
      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-[#DDE3F9]">
              <th className="py-3 px-4 text-left text-sm font-normal">ULB</th>
              <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                City Name
              </th>
              <th className="py-3 px-4 text-left text-sm font-normal min-w-[180px]">
                Rating Date
              </th>
              <th className="py-3 px-4 text-left text-sm font-normal">
                Rating
              </th>
              <th className="py-3 px-4 text-left text-sm font-normal">
                Uploaded File
              </th>
              {isEditable("1.3") && (
                <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {ulbList.length > 0 ? (
              ulbList.map((item, index) => (
                <tr key={item.id || index} className="border-b">
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.3") ? (
                      <div>
                        <Dropdown
                          options={ulbDropdownOptions.filter((option) => {
                            // Filter out ULBs already selected in other rows (unless it's the current row's selection)
                            const isAlreadySelected = ulbList.some(
                              (ulb, idx) =>
                                idx !== index &&
                                ulb.ulb === option.value &&
                                ulb.ulb !== ""
                            );
                            return (
                              !isAlreadySelected || option.value === item.ulb
                            );
                          })}
                          value={item.ulb ? String(item.ulb) : ""}
                          onChange={(value) =>
                            handleUlbChange(index, "ulb", value)
                          }
                          placeholder={
                            ulbLoading
                              ? "Loading..."
                              : ulbError
                              ? "Failed to load ULBs"
                              : "Select ULB"
                          }
                          isEditable={isEditable("1.3")}
                          isSearchable={true}
                        />
                        {getError(`section1_3.ulbList.${index}.ulb`) && (
                          <p className="text-sm text-red-500 mt-1">
                            {getError(`section1_3.ulbList.${index}.ulb`)}
                          </p>
                        )}
                        {ulbError && (
                          <div className="text-xs text-red-500 mt-1">
                            {ulbError}
                          </div>
                        )}
                        {ulbLoading && (
                          <div className="text-xs text-blue-500 mt-1">
                            Loading ULBs...
                          </div>
                        )}
                      </div>
                    ) : (
                      (() => {
                        // Try to show best available name from item itself first
                        let label = "";
                        if (item.ulb && ulbDropdownOptions.length > 0) {
                          const found = ulbDropdownOptions.find(
                            (u) => u.value === String(item.ulb)
                          );
                          if (found) label = found.label;
                        }
                        // If not found, fallback to item fields
                        if (!label) {
                          const ulbName = item.ulb_name || item.name || "";
                          const cityName =
                            item.cityName || item.city_name || item.city || "";
                          const ulbType = item.ulb_type || item.type || "";
                          label = ulbName;
                          if (cityName) label += ` - ${cityName}`;
                          if (ulbType) label += ` (${ulbType})`;
                        }
                        return label && label.trim() !== "" ? label : "N/A";
                      })()
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.3") ? (
                      <div>
                        <Input
                          value={item.cityName || ""}
                          readOnly
                          className={
                            getError(`section1_3.ulbList.${index}.cityName`)
                              ? "w-full bg-gray-100 cursor-not-allowed border-red-500"
                              : "w-full bg-gray-100 cursor-not-allowed"
                          }
                          placeholder="City name auto-filled"
                        />
                        {getError(`section1_3.ulbList.${index}.cityName`) && (
                          <p className="text-sm text-red-500 mt-1">
                            {getError(`section1_3.ulbList.${index}.cityName`)}
                          </p>
                        )}
                      </div>
                    ) : (
                      item.cityName || "N/A"
                    )}
                  </td>

                  <td className="py-3 px-4 text-sm font-normal min-w-[180px]">
                    {isEditable("1.3") ? (
                      <div>
                        <Input
                          type="date"
                          max={new Date().toISOString().split("T")[0]}
                          value={formatDateForInput(item.ratingDate)}
                          onChange={(e) => {
                            handleUlbChange(
                              index,
                              "ratingDate",
                              e.target.value
                                ? new Date(e.target.value).toISOString()
                                : ""
                            );
                          }}
                          className={cn(
                            "w-full min-w-[160px] bg-[#fff] border border-[#C6C6C6]",
                            !item.ratingDate && "text-muted-foreground",
                            getError(
                              `section1_3.ulbList.${index}.ratingDate`
                            ) && "border-red-500"
                          )}
                        />
                        {getError(`section1_3.ulbList.${index}.ratingDate`) && (
                          <p className="text-sm text-red-500 mt-1">
                            {getError(`section1_3.ulbList.${index}.ratingDate`)}
                          </p>
                        )}
                      </div>
                    ) : item.ratingDate ? (
                      format(new Date(item.ratingDate), "dd-MM-yyyy")
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.3") ? (
                      <div>
                        <Dropdown
                          options={dropdownValues.ratingList.map((opt) => ({
                            label: opt,
                            value: opt,
                          }))}
                          value={item.rating || ""}
                          onChange={(value) =>
                            handleUlbChange(index, "rating", value)
                          }
                          placeholder="Select Rating"
                          isEditable={true}
                        />
                        {getError(`section1_3.ulbList.${index}.rating`) && (
                          <p className="text-sm text-red-500 mt-1">
                            {getError(`section1_3.ulbList.${index}.rating`)}
                          </p>
                        )}
                      </div>
                    ) : (
                      item.rating || "N/A"
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.3") ? (
                      <div className="space-y-1.5">
                        {/* No Document Available Checkbox */}
                        <div className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`no-doc-1.3-${index}`}
                            checked={item.noDocumentAvailable || false}
                            onCheckedChange={(checked) => {
                              const noDocument = checked as boolean;
                              const updatedUlbList = [...ulbList];
                              updatedUlbList[index] = {
                                ...updatedUlbList[index],
                                noDocumentAvailable: noDocument,
                                file: noDocument
                                  ? null
                                  : updatedUlbList[index].file,
                              };
                              if (setSectionState) {
                                setSectionState({
                                  totalULBs,
                                  ulbList: updatedUlbList,
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor={`no-doc-1.3-${index}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            No document available
                          </label>
                        </div>

                        {/* File Upload Section - only show if noDocumentAvailable is false */}
                        {item.noDocumentAvailable &&
                        !(
                          item.file?.file ||
                          item.file?.fileName ||
                          item.file?.filePath ||
                          item.file?.fileUrl
                        ) ? (
                          <div className="px-3 py-2 rounded-md bg-gray-100 text-gray-600 text-sm">
                            No document available
                          </div>
                        ) : (
                          <FileUploadSection
                            label="Upload File"
                            required
                            value={item.file ?? null}
                            onChange={(fileUpload) => {
                              const updatedUlbList = [...ulbList];
                              updatedUlbList[index] = {
                                ...updatedUlbList[index],
                                file: fileUpload,
                                noDocumentAvailable: fileUpload
                                  ? false
                                  : updatedUlbList[index].noDocumentAvailable ||
                                    false,
                              };
                              if (setSectionState) {
                                setSectionState({
                                  totalULBs,
                                  ulbList: updatedUlbList,
                                });
                              }
                            }}
                            submissionId={submissionId}
                            disabled={false}
                            deferFileDeletion={deferFileDeletion}
                            showNoDocumentOption={false}
                            className={cn(
                              getError(`section1_3.ulbList.${index}.file`) &&
                                "border-red-500"
                            )}
                          />
                        )}
                        {getError(`section1_3.ulbList.${index}.file`) && (
                          <p className="text-sm text-red-500 mt-1">
                            {getError(`section1_3.ulbList.${index}.file`)}
                          </p>
                        )}
                      </div>
                    ) : item.noDocumentAvailable ? (
                      <div className="px-3 py-2 rounded-md bg-gray-100 text-gray-600 text-sm">
                        No document available
                      </div>
                    ) : item.file?.fileName ? (
                      <span className="text-primary">
                        {extractOriginalName(
                          item.file.fileName || "",
                          (item.file as any)?.originalName
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  {isEditable("1.3") && (
                    <td className="py-3 px-4 text-sm font-normal">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log(
                            `[Section_1_3] Delete button clicked for item:`,
                            item
                          );
                          console.log(
                            `[Section_1_3] isEditable("1.3"):`,
                            isEditable("1.3")
                          );
                          // Always pass the index for reliable deletion
                          // Pass both id and index to ensure correct deletion even if IDs are duplicated
                          const idOrIndex =
                            item.id !== undefined && item.id !== null
                              ? item.id
                              : index;
                          handleRemoveULB(idOrIndex, index);
                        }}
                        className="text-red-500 hover:text-red-700 border-none bg-none"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={isEditable("1.3") ? 6 : 5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No ULB data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add More Button - Only visible when in edit mode and totalULBs > 0 */}
      {isEditable("1.3") && !showAddULBForm && totalULBs > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setShowAddULBForm(true)}
          disabled={ulbList.length >= totalULBs}
        >
          <Plus className="w-4 h-4" />
          Add More
        </Button>
      )}

      {/* Add ULB Form - Only visible when showAddULBForm is true */}
      {showAddULBForm && isEditable("1.3") && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-3">Add New ULB Entry</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>ULB</Label>
              <Dropdown
                options={ulbDropdownOptions.filter((option) => {
                  // Filter out ULBs already selected in existing rows
                  const isAlreadySelected = ulbList.some(
                    (ulb) => ulb.ulb === option.value && ulb.ulb !== ""
                  );
                  return !isAlreadySelected;
                })}
                value={newULBEntry.ulb ? String(newULBEntry.ulb) : ""}
                onChange={(value) => {
                  // Check for duplicates before allowing selection
                  const isDuplicate = ulbList.some(
                    (ulb) => ulb.ulb === String(value) && String(value) !== ""
                  );

                  if (isDuplicate) {
                    // Set error
                    setDuplicateErrors((prev) => ({
                      ...prev,
                      "section1_3.ulbList.new.ulb":
                        "This ULB has already been selected in another row. Please choose a different ULB.",
                    }));
                    return;
                  }

                  // Clear error
                  setDuplicateErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors["section1_3.ulbList.new.ulb"];
                    return newErrors;
                  });

                  // Auto-fill city name from selected ULB
                  const selectedULB = ulbDropdownOptions.find(
                    (u) => u.value === String(value)
                  );
                  let cityName = "";
                  if (selectedULB && selectedULB.label) {
                    // Try to extract city name from label (format: ulb_name - city_name (ulb_type))
                    const match =
                      selectedULB.label.match(/-\s([^()]+)(?:\(|$)/);
                    if (match && match[1]) {
                      cityName = match[1].trim();
                    }
                  }
                  setNewULBEntry({ ...newULBEntry, ulb: value, cityName });
                }}
                placeholder={
                  ulbLoading
                    ? "Loading..."
                    : ulbError
                    ? "Failed to load ULBs"
                    : "Select ULB"
                }
                isEditable={!ulbLoading && !ulbError}
                isSearchable={true}
              />
              {getError("section1_3.ulbList.new.ulb") && (
                <p className="text-sm text-red-500 mt-1">
                  {getError("section1_3.ulbList.new.ulb")}
                </p>
              )}
              {ulbError && (
                <div className="text-xs text-red-500 mt-1">{ulbError}</div>
              )}
            </div>
            <div>
              <Label>City Name</Label>
              <Input
                value={newULBEntry.cityName}
                onChange={(e) => {
                  let value = e.target.value;
                  value = value.replace(/[^a-zA-Z\s]/g, "");
                  setNewULBEntry({ ...newULBEntry, cityName: value });
                }}
                className={
                  getError("section1_3.ulbList.new.cityName")
                    ? "bg-white border-red-500"
                    : "bg-white"
                }
                placeholder="Enter city name"
              />
              {getError("section1_3.ulbList.new.cityName") && (
                <p className="text-sm text-red-500 mt-1">
                  {getError("section1_3.ulbList.new.cityName")}
                </p>
              )}
            </div>

            <div>
              <Label>Rating Date</Label>
              <Input
                type="date"
                max={new Date().toISOString().split("T")[0]}
                value={formatDateForInput(newULBEntry.ratingDate)}
                onChange={(e) => {
                  setNewULBEntry({
                    ...newULBEntry,
                    ratingDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : "",
                  });
                }}
                className={cn(
                  "w-full bg-[#fff] border border-[#C6C6C6]",
                  !newULBEntry.ratingDate && "text-muted-foreground",
                  getError("section1_3.ulbList.new.ratingDate") &&
                    "border-red-500"
                )}
              />
              {getError("section1_3.ulbList.new.ratingDate") && (
                <p className="text-sm text-red-500 mt-1">
                  {getError("section1_3.ulbList.new.ratingDate")}
                </p>
              )}
            </div>
            <div>
              <Label>Rating</Label>
              <Dropdown
                options={dropdownValues.ratingList.map((opt) => ({
                  label: opt,
                  value: opt,
                }))}
                value={newULBEntry.rating}
                onChange={(value) =>
                  setNewULBEntry({ ...newULBEntry, rating: value })
                }
                placeholder="Select Rating"
                isEditable={true}
              />
              {getError("section1_3.ulbList.new.rating") && (
                <p className="text-sm text-red-500 mt-1">
                  {getError("section1_3.ulbList.new.rating")}
                </p>
              )}
            </div>
          </div>
          <div className="mb-4">
            <FileUploadSection
              label="Upload File"
              required
              value={newULBEntry.file ?? null}
              onChange={(fileUpload) => {
                setNewULBEntry({
                  ...newULBEntry,
                  file: fileUpload,
                  noDocumentAvailable: fileUpload
                    ? false
                    : newULBEntry.noDocumentAvailable || false,
                });
              }}
              submissionId={submissionId}
              disabled={false}
              deferFileDeletion={deferFileDeletion}
              showNoDocumentOption={true}
              noDocumentAvailable={newULBEntry.noDocumentAvailable || false}
              onNoDocumentChange={(noDocument) => {
                setNewULBEntry({
                  ...newULBEntry,
                  noDocumentAvailable: noDocument,
                  file: noDocument ? null : newULBEntry.file,
                });
              }}
              className={cn(
                getError("section1_3.ulbList.new.file") && "border-red-500"
              )}
            />
            {getError("section1_3.ulbList.new.file") && (
              <p className="text-sm text-red-500 mt-1">
                {getError("section1_3.ulbList.new.file")}
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="default"
              size="sm"
              onClick={handleAddNewULBEntry}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save Entry
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelAddULBEntry}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
