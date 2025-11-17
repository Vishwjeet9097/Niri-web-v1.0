import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dropdown, dropdownValues } from "@/utils/getDropDowns";
import { Plus, Check, X } from "lucide-react";

interface Section1_3Props {
  formData: any;
  isEditable: (sectionId: string) => boolean;
  setSectionState?: (state: { totalULBs: number; ulbList: any[] }) => void;
  resetKey?: number;
}

export const Section_1_3 = ({ formData, isEditable, setSectionState, resetKey }: Section1_3Props) => {
  const ulbList = formData?.section1_3?.ulbList || [];
  const totalULBs = formData?.section1_3?.totalULBs || 0;

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
    updatedUlbList[index] = { ...updatedUlbList[index], [field]: value };
    if (setSectionState) {
      setSectionState({ totalULBs, ulbList: updatedUlbList });
    }
  };

  const handleTotalULBsChange = (value: number) => {
    if (setSectionState) {
      setSectionState({ totalULBs: value, ulbList });
    }
  };

  // Handle adding new ULB entry
  const handleAddNewULBEntry = () => {
    const newEntryWithId = {
      ...newULBEntry,
      id: `ulb-${Date.now()}`,
    };
    const updatedUlbList = [...ulbList, newEntryWithId];
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
          value={totalULBs}
          onChange={(e) => handleTotalULBsChange(Number(e.target.value))}
          readOnly={!isEditable("1.3")}
          className={isEditable("1.3") ? "bg-white" : "bg-gray-50"}
        />
      </div>

      {/* ULB Table */}
      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-[#DDE3F9]">
              <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">City Name</th>
              <th className="py-3 px-4 text-left text-sm font-normal">ULB</th>
              <th className="py-3 px-4 text-left text-sm font-normal">Rating Date</th>
              <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">Rating</th>
            </tr>
          </thead>
          <tbody>
            {ulbList.length > 0 ? (
              ulbList.map((item, index) => (
                <tr key={item.id || index} className="border-b">
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.3") ? (
                      <Input
                        value={item.cityName || ""}
                        onChange={(e) => handleUlbChange(index, "cityName", e.target.value)}
                        className="w-full"
                        placeholder="Enter city name"
                      />
                    ) : (
                      item.cityName || 'N/A'
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.3") ? (
                      <Dropdown
                        options={dropdownValues.ulbList}
                        value={item.ulb || ""}
                        onChange={(value) => handleUlbChange(index, "ulb", value)}
                        placeholder="Select ULB"
                        isEditable={true}
                      />
                    ) : (
                      item.ulb || 'N/A'
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.3") ? (
                      <Input
                        type="date"
                        value={item.ratingDate || ""}
                        onChange={(e) => handleUlbChange(index, "ratingDate", e.target.value)}
                        className="w-full"
                      />
                    ) : (
                      item.ratingDate ? new Date(item.ratingDate).toLocaleDateString() : 'N/A'
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.3") ? (
                      <Dropdown
                        options={dropdownValues.ratingList}
                        value={item.rating || ""}
                        onChange={(value) => handleUlbChange(index, "rating", value)}
                        placeholder="Select Rating"
                        isEditable={true}
                      />
                    ) : (
                      item.rating || 'N/A'
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">
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
              <Label>City Name</Label>
              <Input 
                value={newULBEntry.cityName} 
                onChange={(e) => setNewULBEntry({...newULBEntry, cityName: e.target.value})}
                className="bg-white"
                placeholder="Enter city name"
              />
            </div>
            <div>
              <Label>ULB</Label>
              <Dropdown
                options={dropdownValues.ulbList}
                value={newULBEntry.ulb}
                onChange={(value) => setNewULBEntry({...newULBEntry, ulb: value})}
                placeholder="Select ULB"
                isEditable={true}
              />
            </div>
            <div>
              <Label>Rating Date</Label>
              <Input
                type="date"
                value={newULBEntry.ratingDate}
                onChange={(e) => setNewULBEntry({...newULBEntry, ratingDate: e.target.value})}
                className="bg-white"
              />
            </div>
            <div>
              <Label>Rating</Label>
              <Dropdown
                options={dropdownValues.ratingList}
                value={newULBEntry.rating}
                onChange={(value) => setNewULBEntry({...newULBEntry, rating: value})}
                placeholder="Select Rating"
                isEditable={true}
              />
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

