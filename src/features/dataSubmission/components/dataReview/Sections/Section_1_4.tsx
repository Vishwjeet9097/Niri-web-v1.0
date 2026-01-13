import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dropdown, dropdownValues } from "@/utils/getDropDowns";
import { Plus, Check, X, Trash2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import axios from "axios";
import { API_ENDPOINTS } from "@/config/endpoints";

interface Section1_4Props {
  formData: any;
  isEditable: (sectionId: string) => boolean;
  setSectionState?: (state: { totalULBs: number; bondList: any[] }) => void;
  resetKey?: number;
  validationErrors?: { [key: string]: string };
  getFieldError?: (fieldPath: string) => string | undefined;
}

export const Section_1_4 = ({
  formData,
  isEditable,
  setSectionState,
  resetKey,
  validationErrors = {},
  getFieldError,
}: Section1_4Props) => {
  const getError = (fieldPath: string) => {
    // Check local count errors first, then validation errors
    return (
      countErrors[fieldPath] ||
      (getFieldError ? getFieldError(fieldPath) : validationErrors[fieldPath])
    );
  };
  const bondList = formData?.section1_4?.bondList || [];
  const totalULBs = formData?.section1_4?.totalULBs || 0;

  // Get state name from formData or fallback to logged-in user
  const { user } = useAuth();
  const stateName = user?.state || user?.stateName || "";

  // State for fetched ULBs
  const [ulbDropdownOptions, setUlbDropdownOptions] = useState([]);
  const [ulbLoading, setUlbLoading] = useState(false);
  const [ulbError, setUlbError] = useState("");
  
  // Fetch ULBs for the logged-in user's state
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
    if (stateName) {
      fetchULBs();
    }
  }, [stateName]);

  // Debug: Log component render and editability
  const isSectionEditable = isEditable("1.4");
  console.log(
    `[Section_1_4] Component render - isEditable("1.4"):`,
    isSectionEditable
  );
  console.log(`[Section_1_4] bondList length:`, bondList.length);
  console.log(`[Section_1_4] bondList:`, bondList);

  // Debug: Log when bondList changes
  useEffect(() => {
    console.log(`[Section_1_4] bondList updated:`, bondList);
    console.log(`[Section_1_4] isEditable("1.4"):`, isEditable("1.4"));
  }, [bondList]);

  // State for adding new bond entry
  const [showAddBondForm, setShowAddBondForm] = useState(false);
  const [newBondEntry, setNewBondEntry] = useState({
    bondType: "",
    ulb: "",
    cityName: "",
    issuingAuthority: "",
    value: "",
    tenorOfBond: "",
  });

  // Local state for count validation errors
  const [countErrors, setCountErrors] = useState<{ [key: string]: string }>({});

  // Reset form when resetKey changes (on cancel)
  useEffect(() => {
    if (resetKey !== undefined && resetKey > 0) {
      setShowAddBondForm(false);
      setNewBondEntry({
        bondType: "",
        ulb: "",
        cityName: "",
        issuingAuthority: "",
        value: "",
        tenorOfBond: "",
      });
      setCountErrors({});
    }
  }, [resetKey]);

  // Validate totalULBs vs bondList.length
  useEffect(() => {
    if (totalULBs > 0 && bondList.length > totalULBs) {
      // Set validation error
      setCountErrors((prev) => ({
        ...prev,
        "section1_4.bondList": `Number of rows (${bondList.length}) cannot exceed Total Number of ULBs (${totalULBs}). Please remove excess rows or increase the Total Number of ULBs.`,
      }));
    } else {
      // Clear error if valid
      setCountErrors((prev) => {
        const newErrors: { [key: string]: string } = {};
        Object.keys(prev).forEach((key) => {
          // Keep other errors, clear count-related errors
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
  }, [totalULBs, bondList.length]);

  // Update parent state on change
  const handleBondChange = (index: number, field: string, value: any) => {
    const updatedBondList = [...bondList];
    // If ULB is changed, auto-fill city name and store ULB details
    if (field === "ulb") {
      const stringValue = value ? String(value) : "";
      const selectedULB = ulbDropdownOptions.find(
        (u) => String(u.value) === stringValue
      );
      // Try to get city name from label (format: ulb_name - city_name (ulb_type))
      let cityName = "";
      let ulbName = "";
      let ulbType = "";
      
      if (selectedULB && selectedULB.label) {
        // Parse the label to extract ULB name, city name, and type
        const match = selectedULB.label.match(/^([^-]+)(?:-\s([^()]+))?(?:\s\(([^)]+)\))?$/);
        if (match) {
          ulbName = match[1].trim();
          cityName = match[2] ? match[2].trim() : "";
          ulbType = match[3] ? match[3].trim() : "";
        }
      }
      
      updatedBondList[index] = {
        ...updatedBondList[index],
        [field]: stringValue,
        cityName,
        // Store ULB details for display even if dropdown options aren't loaded later
        ulb_name: ulbName,
        ulb_type: ulbType,
      };
    } else {
      updatedBondList[index] = { ...updatedBondList[index], [field]: value };
    }
    if (setSectionState) {
      setSectionState({ totalULBs, bondList: updatedBondList });
    }
  };

  const handleTotalULBsChange = (value: number) => {
    const newTotalULBs = value || 0;
    let updatedList = [...bondList];

    // If new total is less than current rows, trim the list
    if (newTotalULBs < bondList.length) {
      updatedList = bondList.slice(0, newTotalULBs);
    }
    // If new total is greater than 0 and list is empty, add at least one entry
    else if (newTotalULBs > 0 && bondList.length === 0) {
      updatedList = [
        {
          id: `bond-${Date.now()}`,
          bondType: "",
          ulb: "",
          cityName: "",
          issuingAuthority: "",
          value: "",
          tenorOfBond: "",
        },
      ];
    }

    // Clear validation error if totalULBs is now valid
    setCountErrors((prev) => {
      const newErrors: { [key: string]: string } = {};
      Object.keys(prev).forEach((key) => {
        // Keep other errors, clear count-related errors
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
      setSectionState({ totalULBs: newTotalULBs, bondList: updatedList });
    }
  };

  const handleRemoveBond = (
    idOrIndex: string | number,
    targetIndex?: number
  ) => {
    console.log(
      `[Section_1_4] handleRemoveBond called with idOrIndex:`,
      idOrIndex,
      `targetIndex:`,
      targetIndex
    );
    console.log(`[Section_1_4] Current bondList:`, bondList);

    // If targetIndex is provided, use index-based deletion (most reliable)
    if (targetIndex !== undefined && targetIndex >= 0) {
      const updatedBondList = bondList.filter(
        (bond, index) => index !== targetIndex
      );
      console.log(
        `[Section_1_4] Updated bondList (index-based):`,
        updatedBondList
      );
      if (setSectionState) {
        setSectionState({ totalULBs, bondList: updatedBondList });
      }
      return;
    }

    // Otherwise, try ID-based deletion
    const targetId = String(idOrIndex);
    const parsedIndex = parseInt(targetId, 10);
    const isIndex = !isNaN(parsedIndex) && parsedIndex >= 0;

    const updatedBondList = bondList.filter((bond, index) => {
      // If bond has an id, compare by id AND index to ensure uniqueness
      if (bond.id !== undefined && bond.id !== null) {
        const bondId = String(bond.id);
        // Match by ID, but also ensure we're matching the correct item by index if provided
        if (bondId === targetId) {
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

      // Fallback: keep the bond if we can't match
      return true;
    });

    console.log(`[Section_1_4] Updated bondList:`, updatedBondList);
    if (setSectionState) {
      setSectionState({ totalULBs, bondList: updatedBondList });
    }
  };

  // Handle adding new bond entry
  const handleAddNewBondEntry = () => {
    // Check if we can add more rows
    if (bondList.length >= totalULBs) {
      // Set validation error
      setCountErrors((prev) => ({
        ...prev,
        "section1_4.bondList": `Cannot add more rows. Total Number of ULBs is ${totalULBs}, and you already have ${bondList.length} row(s). Please increase the Total Number of ULBs first.`,
      }));
      return;
    }

    // Clear validation error
    setCountErrors((prev) => {
      const newErrors: { [key: string]: string } = {};
      Object.keys(prev).forEach((key) => {
        if (!key.includes("Cannot add more rows")) {
          newErrors[key] = prev[key];
        }
      });
      return newErrors;
    });

    const newEntryWithId = {
      ...newBondEntry,
      id: `bond-${Date.now()}`,
    };
    const updatedBondList = [...bondList, newEntryWithId];
    if (setSectionState) {
      setSectionState({ totalULBs, bondList: updatedBondList });
    }
    // Reset form
    setNewBondEntry({
      bondType: "",
      ulb: "",
      cityName: "",
      issuingAuthority: "",
      value: "",
      tenorOfBond: "",
    });
    setShowAddBondForm(false);
  };

  // Handle cancel adding new bond entry
  const handleCancelAddBondEntry = () => {
    setNewBondEntry({
      bondType: "",
      ulb: "",
      cityName: "",
      issuingAuthority: "",
      value: "",
      tenorOfBond: "",
    });
    setShowAddBondForm(false);
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
            readOnly={!isEditable("1.4")}
            className={isEditable("1.4") ? "bg-white" : "bg-gray-50"}
            onChange={(e) => {
              const value = e.target.value;
              // Only allow non-negative integers
              if (value === "" || /^\d+$/.test(value)) {
                handleTotalULBsChange(value === "" ? 0 : Number(value));
              }
            }}
          />
        </div>
        <div className="max-w-xs">
          <Label>ULB issuing bond</Label>
          <Input
            type="number"
            value={bondList.length || 0}
            readOnly
            className="bg-gray-50 cursor-not-allowed"
          />
        </div>
        <div className="max-w-xs">
          <Label>% of ULBs Issuing Bonds</Label>
          <Input
            type="text"
            value={
              totalULBs > 0
                ? ((bondList.length / totalULBs) * 100).toFixed(2) + "%"
                : "0%"
            }
            readOnly
            className="bg-gray-50 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Validation error for bondList */}
      {getError("section1_4.bondList") && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-500">
            {getError("section1_4.bondList")}
          </p>
        </div>
      )}

      {/* Bond Table */}
      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-[#DDE3F9]">
              <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                Bond Type
              </th>
              <th className="py-3 px-4 text-left text-sm font-normal">ULB</th>
              <th className="py-3 px-4 text-left text-sm font-normal">City</th>
              <th className="py-3 px-4 text-left text-sm font-normal">
                Issuing Authority
              </th>
              <th className="py-3 px-4 text-left text-sm font-normal">
                Value (INR-CRORE)
              </th>
              <th className="py-3 px-4 text-left text-sm font-normal">
                Tenor of Bond (in months)
              </th>
              {isEditable("1.4") && (
                <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {bondList.length > 0 ? (
              bondList.map((item, index) => (
                <tr key={item.id || index} className="border-b">
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.4") ? (
                      <div>
                        <Dropdown
                          options={dropdownValues.bondTypeList.map((opt) => ({
                            label: opt,
                            value: opt,
                          }))}
                          value={item.bondType || ""}
                          onChange={(value) =>
                            handleBondChange(index, "bondType", value)
                          }
                          placeholder="Select Bond Type"
                          isEditable={true}
                        />
                        {getError(`section1_4.bondList.${index}.bondType`) && (
                          <p className="text-sm text-red-500 mt-1">
                            {getError(`section1_4.bondList.${index}.bondType`)}
                          </p>
                        )}
                      </div>
                    ) : (
                      item.bondType || "N/A"
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.4") ? (
                      <div>
                        <Dropdown
                          options={ulbDropdownOptions.filter((option) => {
                            // Filter out ULBs already selected in other rows (unless it's the current row's selection)
                            const isAlreadySelected = bondList.some(
                              (bond, idx) =>
                                idx !== index &&
                                bond.ulb === option.value &&
                                bond.ulb !== ""
                            );
                            return (
                              !isAlreadySelected || option.value === item.ulb
                            );
                          })}
                          value={item.ulb ? String(item.ulb) : ""}
                          onChange={(value) =>
                            handleBondChange(index, "ulb", value)
                          }
                          placeholder={
                            ulbLoading
                              ? "Loading..."
                              : ulbError
                              ? "Failed to load ULBs"
                              : "Select ULB"
                          }
                          isEditable={isEditable("1.4")}
                          isSearchable={true}
                        />
                        {getError(`section1_4.bondList.${index}.ulb`) && (
                          <p className="text-sm text-red-500 mt-1">
                            {getError(`section1_4.bondList.${index}.ulb`)}
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
                        
                        // First, check if we have the ULB ID and dropdown options are loaded
                        if (item.ulb) {
                          // Try to find in dropdown options (convert both to string for comparison)
                          if (ulbDropdownOptions.length > 0) {
                            const found = ulbDropdownOptions.find(
                              (u) => String(u.value) === String(item.ulb)
                            );
                            if (found) {
                              label = found.label;
                            }
                          }
                          
                          // If not found in dropdown options, check if item has ULB name stored
                          if (!label && item.ulb_name) {
                            const cityName = item.cityName || item.city_name || "";
                            const ulbType = item.ulb_type || item.type || "";
                            label = item.ulb_name;
                            if (cityName) label += ` - ${cityName}`;
                            if (ulbType) label += ` (${ulbType})`;
                          }
                          
                          // Last resort: if we have ULB ID but no name, show ID
                          if (!label) {
                            label = `ULB ID: ${item.ulb}`;
                          }
                        }
                        
                        return label && label.trim() !== "" ? label : "N/A";
                      })()
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.4") ? (
                      <div>
                        <Input
                          value={item.cityName || ""}
                          readOnly
                          className={
                            getError(`section1_4.bondList.${index}.cityName`)
                              ? "w-full bg-gray-100 cursor-not-allowed border-red-500"
                              : "w-full bg-gray-100 cursor-not-allowed"
                          }
                          placeholder="City name auto-filled"
                        />
                        {getError(`section1_4.bondList.${index}.cityName`) && (
                          <p className="text-sm text-red-500 mt-1">
                            {getError(`section1_4.bondList.${index}.cityName`)}
                          </p>
                        )}
                      </div>
                    ) : (
                      item.cityName || "N/A"
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.4") ? (
                      <div>
                        <Dropdown
                          options={dropdownValues.issuingAuthorityList.map(
                            (opt) => ({ label: opt, value: opt })
                          )}
                          value={item.issuingAuthority || ""}
                          onChange={(value) =>
                            handleBondChange(index, "issuingAuthority", value)
                          }
                          placeholder="Select Issuing Authority"
                          isEditable={true}
                        />
                        {getError(
                          `section1_4.bondList.${index}.issuingAuthority`
                        ) && (
                          <p className="text-sm text-red-500 mt-1">
                            {getError(
                              `section1_4.bondList.${index}.issuingAuthority`
                            )}
                          </p>
                        )}
                      </div>
                    ) : (
                      item.issuingAuthority || "N/A"
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.4") ? (
                      <div>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={item.value || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow numbers and decimal point
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              handleBondChange(index, "value", value);
                            }
                          }}
                          className={
                            getError(`section1_4.bondList.${index}.value`)
                              ? "w-full border-red-500"
                              : "w-full"
                          }
                          placeholder="Enter value"
                        />
                        {getError(`section1_4.bondList.${index}.value`) && (
                          <p className="text-sm text-red-500 mt-1">
                            {getError(`section1_4.bondList.${index}.value`)}
                          </p>
                        )}
                      </div>
                    ) : (
                      item.value || "N/A"
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.4") ? (
                      <div>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={item.tenorOfBond || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow numbers and decimal point
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              handleBondChange(index, "tenorOfBond", value);
                            }
                          }}
                          className={
                            getError(`section1_4.bondList.${index}.tenorOfBond`)
                              ? "w-full border-red-500"
                              : "w-full"
                          }
                          placeholder="Enter tenor in years"
                        />
                        {getError(
                          `section1_4.bondList.${index}.tenorOfBond`
                        ) && (
                          <p className="text-sm text-red-500 mt-1">
                            {getError(
                              `section1_4.bondList.${index}.tenorOfBond`
                            )}
                          </p>
                        )}
                      </div>
                    ) : (
                      item.tenorOfBond || "N/A"
                    )}
                  </td>
                  {isEditable("1.4") && (
                    <td className="py-3 px-4 text-sm font-normal">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log(
                            `[Section_1_4] Delete button clicked for item:`,
                            item
                          );
                          console.log(
                            `[Section_1_4] isEditable("1.4"):`,
                            isEditable("1.4")
                          );
                          // Always pass the index for reliable deletion
                          // Pass both id and index to ensure correct deletion even if IDs are duplicated
                          const idOrIndex =
                            item.id !== undefined && item.id !== null
                              ? item.id
                              : index;
                          handleRemoveBond(idOrIndex, index);
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
                  colSpan={isEditable("1.4") ? 7 : 6}
                  className="py-8 text-center text-muted-foreground"
                >
                  No bond data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add More Button - Only visible when in edit mode and totalULBs > 0 */}
      {isEditable("1.4") && !showAddBondForm && totalULBs > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setShowAddBondForm(true)}
          disabled={bondList.length >= totalULBs}
        >
          <Plus className="w-4 h-4" />
          Add More
        </Button>
      )}

      {/* Add Bond Form - Only visible when showAddBondForm is true */}
      {showAddBondForm && isEditable("1.4") && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-3">Add New Bond Entry</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Bond Type</Label>
              <Dropdown
                options={dropdownValues.bondTypeList.map((opt) => ({
                  label: opt,
                  value: opt,
                }))}
                value={newBondEntry.bondType}
                onChange={(value) =>
                  setNewBondEntry({ ...newBondEntry, bondType: value })
                }
                placeholder="Select Bond Type"
                isEditable={true}
              />
              {getError("section1_4.bondList.new.bondType") && (
                <p className="text-sm text-red-500 mt-1">
                  {getError("section1_4.bondList.new.bondType")}
                </p>
              )}
            </div>
            <div>
              <Label>ULB</Label>
              <Dropdown
                options={ulbDropdownOptions.filter((option) => {
                  // Filter out ULBs already selected in existing rows
                  const isAlreadySelected = bondList.some(
                    (bond) => bond.ulb === option.value && bond.ulb !== ""
                  );
                  return !isAlreadySelected;
                })}
                value={newBondEntry.ulb ? String(newBondEntry.ulb) : ""}
                onChange={(value) => {
                  // Auto-fill city name from selected ULB and store ULB details
                  const selectedULB = ulbDropdownOptions.find(
                    (u) => String(u.value) === String(value)
                  );
                  let cityName = "";
                  let ulbName = "";
                  let ulbType = "";
                  
                  if (selectedULB && selectedULB.label) {
                    // Parse the label to extract ULB name, city name, and type
                    const match = selectedULB.label.match(/^([^-]+)(?:-\s([^()]+))?(?:\s\(([^)]+)\))?$/);
                    if (match) {
                      ulbName = match[1].trim();
                      cityName = match[2] ? match[2].trim() : "";
                      ulbType = match[3] ? match[3].trim() : "";
                    }
                  }
                  
                  setNewBondEntry({ 
                    ...newBondEntry, 
                    ulb: value, 
                    cityName,
                    ulb_name: ulbName,
                    ulb_type: ulbType,
                  });
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
              {getError("section1_4.bondList.new.ulb") && (
                <p className="text-sm text-red-500 mt-1">
                  {getError("section1_4.bondList.new.ulb")}
                </p>
              )}
              {ulbError && (
                <div className="text-xs text-red-500 mt-1">{ulbError}</div>
              )}
            </div>
            <div>
              <Label>City Name</Label>
              <Input
                value={newBondEntry.cityName}
                readOnly
                className={
                  getError("section1_4.bondList.new.cityName")
                    ? "w-full bg-gray-100 cursor-not-allowed border-red-500"
                    : "w-full bg-gray-100 cursor-not-allowed"
                }
                placeholder="City name auto-filled"
              />
              {getError("section1_4.bondList.new.cityName") && (
                <p className="text-sm text-red-500 mt-1">
                  {getError("section1_4.bondList.new.cityName")}
                </p>
              )}
            </div>
            <div>
              <Label>Issuing Authority</Label>
              <Dropdown
                options={dropdownValues.issuingAuthorityList.map((opt) => ({
                  label: opt,
                  value: opt,
                }))}
                value={newBondEntry.issuingAuthority}
                onChange={(value) =>
                  setNewBondEntry({ ...newBondEntry, issuingAuthority: value })
                }
                placeholder="Select Issuing Authority"
                isEditable={true}
              />
              {getError("section1_4.bondList.new.issuingAuthority") && (
                <p className="text-sm text-red-500 mt-1">
                  {getError("section1_4.bondList.new.issuingAuthority")}
                </p>
              )}
            </div>
            <div>
              <Label>Value (INR-CRORE)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={newBondEntry.value}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numbers and decimal point
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setNewBondEntry({ ...newBondEntry, value: value });
                  }
                }}
                className={
                  getError("section1_4.bondList.new.value")
                    ? "bg-white border-red-500"
                    : "bg-white"
                }
                placeholder="Enter value"
              />
              {getError("section1_4.bondList.new.value") && (
                <p className="text-sm text-red-500 mt-1">
                  {getError("section1_4.bondList.new.value")}
                </p>
              )}
            </div>
            <div>
              <Label>
                Tenor of Bond (in months)<span className="text-red-500">*</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="inline w-3 h-3 ml-1" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Tenor – Maturity Period of Bond
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={newBondEntry.tenorOfBond}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numbers and decimal point
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setNewBondEntry({ ...newBondEntry, tenorOfBond: value });
                  }
                }}
                className={
                  getError("section1_4.bondList.new.tenorOfBond")
                    ? "bg-white border-red-500"
                    : "bg-white"
                }
                placeholder="Enter tenor in years"
              />
              {getError("section1_4.bondList.new.tenorOfBond") && (
                <p className="text-sm text-red-500 mt-1">
                  {getError("section1_4.bondList.new.tenorOfBond")}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="default"
              size="sm"
              onClick={handleAddNewBondEntry}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save Entry
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelAddBondEntry}
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
