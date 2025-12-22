import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dropdown, dropdownValues } from "@/utils/getDropDowns";
import { Plus, Check, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import axios from "axios";
import { API_ENDPOINTS } from "@/config/endpoints";

interface Section1_3Props {
  formData: any;
  isEditable: (sectionId: string) => boolean;
  setSectionState?: (state: { totalULBs: number; ulbList: any[] }) => void;
  resetKey?: number;
  validationErrors?: { [key: string]: string };
  getFieldError?: (fieldPath: string) => string | undefined;
}

export const Section_1_3 = ({
  formData,
  isEditable,
  setSectionState,
  resetKey,
  validationErrors = {},
  getFieldError,
}: Section1_3Props) => {
  const getError = (fieldPath: string) => {
    return getFieldError ? getFieldError(fieldPath) : validationErrors[fieldPath];
  };
  const ulbList = formData?.section1_3?.ulbList || [];
  const totalULBs = formData?.section1_3?.totalULBs || 0;
  console.log("[Section_1_3] formData:", formData);
  console.log("[Section_1_3] ulbList:", ulbList);
  // Get state name from formData or fallback to logged-in user
  const { user } = useAuth();
  const stateName =  user?.state || user?.stateName || "";

 
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
  });

  // Reset form when resetKey changes (on cancel)
  useEffect(() => {
    if (resetKey !== undefined && resetKey > 0) {
      setShowAddULBForm(false);
      setNewULBEntry({
        cityName: "",
        ulb: "",
        ratingDate: "",
        rating: "",
      });
    }
  }, [resetKey]);

  // Update parent state on change
  const handleUlbChange = (index: number, field: string, value: any) => {
    const updatedUlbList = [...ulbList];
    // If ULB is changed, auto-fill cityName from dropdown
    if (field === "ulb") {
      const stringValue = value ? String(value) : "";
      const selectedULB = ulbDropdownOptions.find((u) => u.value === stringValue);
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
    if (setSectionState) {
      setSectionState({ totalULBs: value, ulbList });
    }
  };

  const handleRemoveULB = (id: string) => {
    const updatedUlbList = ulbList.filter((ulb) => ulb.id !== id);
    if (setSectionState) {
      setSectionState({ totalULBs, ulbList: updatedUlbList });
    }
  };

  // Handle adding new ULB entry
  const handleAddNewULBEntry = () => {
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
    });
    setShowAddULBForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Total ULBs Display */}
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
      
      {/* Validation error for ulbList */}
      {getError("section1_3.ulbList") && (
        <p className="text-sm text-red-500">{getError("section1_3.ulbList")}</p>
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
                          options={ulbDropdownOptions}
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
                          <p className="text-sm text-red-500 mt-1">{getError(`section1_3.ulbList.${index}.ulb`)}</p>
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
                          const cityName = item.cityName || item.city_name || item.city || "";
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
                          <p className="text-sm text-red-500 mt-1">{getError(`section1_3.ulbList.${index}.cityName`)}</p>
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
                          value={item.ratingDate || ""}
                          onChange={(e) => {
                            handleUlbChange(
                              index,
                              "ratingDate",
                              e.target.value
                            );
                          }}
                          className={cn(
                            "w-full min-w-[160px] bg-[#fff] border border-[#C6C6C6]",
                            !item.ratingDate && "text-muted-foreground",
                            getError(`section1_3.ulbList.${index}.ratingDate`) && "border-red-500"
                          )}
                        />
                        {getError(`section1_3.ulbList.${index}.ratingDate`) && (
                          <p className="text-sm text-red-500 mt-1">{getError(`section1_3.ulbList.${index}.ratingDate`)}</p>
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
                          <p className="text-sm text-red-500 mt-1">{getError(`section1_3.ulbList.${index}.rating`)}</p>
                        )}
                      </div>
                    ) : (
                      item.rating || "N/A"
                    )}
                  </td>
                  {isEditable("1.3") && (
                    <td className="py-3 px-4 text-sm font-normal">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveULB(item.id || index.toString())}
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
                  colSpan={isEditable("1.3") ? 5 : 4}
                  className="py-8 text-center text-muted-foreground"
                >
                  No ULB data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add More Button - Only visible when in edit mode */}
      {isEditable("1.3") && !showAddULBForm && (
        <Button
          variant="outline"
          size="sm"
          className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
          onClick={() => setShowAddULBForm(true)}
        >
          <Plus className="w-4 h-4" />
          Add More
        </Button>
      )}

      {/* Add ULB Form - Only visible when showAddULBForm is true */}
      {showAddULBForm && isEditable("1.3") && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-3">Add New ULB Entry</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>ULB</Label>
              <Dropdown
                options={ulbDropdownOptions}
                value={newULBEntry.ulb ? String(newULBEntry.ulb) : ""}
                onChange={(value) => {
                  // Auto-fill city name from selected ULB
                  const selectedULB = ulbDropdownOptions.find((u) => u.value === String(value));
                  let cityName = "";
                  if (selectedULB && selectedULB.label) {
                    // Try to extract city name from label (format: ulb_name - city_name (ulb_type))
                    const match = selectedULB.label.match(/-\s([^()]+)(?:\(|$)/);
                    if (match && match[1]) {
                      cityName = match[1].trim();
                    }
                  }
                  setNewULBEntry({ ...newULBEntry, ulb: value, cityName });
                }}
                placeholder={ulbLoading ? "Loading..." : "Select ULB"}
                isEditable={true}
                isSearchable={true}
                disabled={ulbLoading || !!ulbError}
              />
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
                <p className="text-sm text-red-500 mt-1">{getError("section1_3.ulbList.new.cityName")}</p>
              )}
            </div>
           
            <div>
              <Label>Rating Date</Label>
              <Input
                type="date"
                value={newULBEntry.ratingDate || ""}
                onChange={(e) => {
                  setNewULBEntry({
                    ...newULBEntry,
                    ratingDate: e.target.value,
                  });
                }}
                className={cn(
                  "w-full bg-[#fff] border border-[#C6C6C6]",
                  !newULBEntry.ratingDate && "text-muted-foreground",
                  getError("section1_3.ulbList.new.ratingDate") && "border-red-500"
                )}
              />
              {getError("section1_3.ulbList.new.ratingDate") && (
                <p className="text-sm text-red-500 mt-1">{getError("section1_3.ulbList.new.ratingDate")}</p>
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
                <p className="text-sm text-red-500 mt-1">{getError("section1_3.ulbList.new.rating")}</p>
              )}
            </div>
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
