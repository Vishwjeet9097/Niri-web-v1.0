import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dropdown, dropdownValues } from "@/utils/getDropDowns";
import { Plus, Check, X } from "lucide-react";

interface Section1_4Props {
  formData: any;
  isEditable: (sectionId: string) => boolean;
  setSectionState?: (state: { totalULBs: number; bondList: any[] }) => void;
  resetKey?: number;
}

export const Section_1_4 = ({ formData, isEditable, setSectionState, resetKey }: Section1_4Props) => {
  const bondList = formData?.section1_4?.bondList || [];
  const totalULBs = formData?.section1_4?.totalULBs || 0;

  // State for adding new bond entry
  const [showAddBondForm, setShowAddBondForm] = useState(false);
  const [newBondEntry, setNewBondEntry] = useState({
    bondType: "",
    cityName: "",
    issuingAuthority: "",
    value: "",
  });

  // Reset form when resetKey changes (on cancel)
  useEffect(() => {
    if (resetKey !== undefined && resetKey > 0) {
      setShowAddBondForm(false);
      setNewBondEntry({
        bondType: "",
        cityName: "",
        issuingAuthority: "",
        value: "",
      });
    }
  }, [resetKey]);

  // Update parent state on change
  const handleBondChange = (index: number, field: string, value: any) => {
    const updatedBondList = [...bondList];
    updatedBondList[index] = { ...updatedBondList[index], [field]: value };
    if (setSectionState) {
      setSectionState({ totalULBs, bondList: updatedBondList });
    }
  };

  const handleTotalULBsChange = (value: number) => {
    if (setSectionState) {
      setSectionState({ totalULBs: value, bondList });
    }
  };

  // Handle adding new bond entry
  const handleAddNewBondEntry = () => {
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
      cityName: "",
      issuingAuthority: "",
      value: "",
    });
    setShowAddBondForm(false);
  };

  // Handle cancel adding new bond entry
  const handleCancelAddBondEntry = () => {
    setNewBondEntry({
      bondType: "",
      cityName: "",
      issuingAuthority: "",
      value: "",
    });
    setShowAddBondForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Total ULBs Display */}
      <div className="max-w-xs">
        <Label>Total Number of ULBs</Label>
        <Input
          type="number"
          value={totalULBs}
          readOnly={!isEditable("1.4")}
          className={isEditable("1.4") ? "bg-white" : "bg-gray-50"}
          onChange={(e) => handleTotalULBsChange(Number(e.target.value))}
        />
      </div>

      {/* Bond Table */}
      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-[#DDE3F9]">
              <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">Bond Type</th>
              <th className="py-3 px-4 text-left text-sm font-normal">City</th>
              <th className="py-3 px-4 text-left text-sm font-normal">Issuing Authority</th>
              <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">Value (INR - values is in CRORES)</th>
            </tr>
          </thead>
          <tbody>
            {bondList.length > 0 ? (
              bondList.map((item, index) => (
                <tr key={item.id || index} className="border-b">
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.4") ? (
                      <Dropdown
                        options={dropdownValues.bondTypeList}
                        value={item.bondType || ""}
                        onChange={(value) => handleBondChange(index, "bondType", value)}
                        placeholder="Select Bond Type"
                        isEditable={true}
                        resetKey={resetKey || 0}
                      />
                    ) : (
                      item.bondType || 'N/A'
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.4") ? (
                      <Dropdown
                        options={dropdownValues.cityList}
                        value={item.cityName || ""}
                        onChange={(value) => handleBondChange(index, "cityName", value)}
                        placeholder="Select City"
                        isEditable={true}
                        resetKey={resetKey || 0}
                      />
                    ) : (
                      item.cityName || 'N/A'
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.4") ? (
                      <Dropdown
                        options={dropdownValues.issuingAuthorityList}
                        value={item.issuingAuthority || ""}
                        onChange={(value) => handleBondChange(index, "issuingAuthority", value)}
                        placeholder="Select Authority"
                        isEditable={true}
                        resetKey={resetKey || 0}
                      />
                    ) : (
                      item.issuingAuthority || 'N/A'
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.4") ? (
                      <Input
                        type="number"
                        value={item.value || ""}
                        onChange={(e) => handleBondChange(index, "value", e.target.value)}
                        className="w-full"
                        placeholder="Enter value"
                      />
                    ) : (
                      item.value || 'N/A'
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">
                  No bond data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add More Button - Only visible when in edit mode */}
      {isEditable("1.4") && !showAddBondForm && (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
          onClick={() => setShowAddBondForm(true)}
        >
          <Plus className="w-4 h-4" />
          Add More
        </Button>
      )}

      {/* Add Bond Form - Only visible when showAddBondForm is true */}
      {showAddBondForm && isEditable("1.4") && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-3">Add New Bond Entry</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Bond Type</Label>
              <Dropdown
                options={dropdownValues.bondTypeList}
                value={newBondEntry.bondType}
                onChange={(value) => setNewBondEntry({...newBondEntry, bondType: value})}
                placeholder="Select Bond Type"
                isEditable={true}
                resetKey={resetKey || 0}
              />
            </div>
            <div>
              <Label>City</Label>
              <Dropdown
                options={dropdownValues.cityList}
                value={newBondEntry.cityName}
                onChange={(value) => setNewBondEntry({...newBondEntry, cityName: value})}
                placeholder="Select City"
                isEditable={true}
                resetKey={resetKey || 0}
              />
            </div>
            <div>
              <Label>Issuing Authority</Label>
              <Dropdown
                options={dropdownValues.issuingAuthorityList}
                value={newBondEntry.issuingAuthority}
                onChange={(value) => setNewBondEntry({...newBondEntry, issuingAuthority: value})}
                placeholder="Select Authority"
                isEditable={true}
                resetKey={resetKey || 0}
              />
            </div>
            <div>
              <Label>Value (INR - values is in CRORES)</Label>
              <Input
                type="number"
                value={newBondEntry.value}
                onChange={(e) => setNewBondEntry({...newBondEntry, value: e.target.value})}
                className="bg-white"
                placeholder="Enter value"
              />
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


