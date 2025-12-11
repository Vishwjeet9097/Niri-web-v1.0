import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dropdown, dropdownValues } from "@/utils/getDropDowns";
import { Plus, Check, X } from "lucide-react";

interface Section1_5Props {
  formData: any;
  isEditable: (sectionId: string) => boolean;
  setSectionState?: (state: any[]) => void;
  resetKey?: number;
}

export const Section_1_5 = ({ formData, isEditable, setSectionState, resetKey }: Section1_5Props) => {
  const orgList = formData?.section1_5 || [];

  // State for adding new organization entry
  const [showAddOrgForm, setShowAddOrgForm] = useState(false);
  const [newOrgEntry, setNewOrgEntry] = useState({
    organisationName: "",
    organisationType: "",
    yearEstablished: "",
    totalFunding: "",
    website: "",
  });

  // Reset form when resetKey changes (on cancel)
  useEffect(() => {
    if (resetKey !== undefined && resetKey > 0) {
      setShowAddOrgForm(false);
      setNewOrgEntry({
        organisationName: "",
        organisationType: "",
        yearEstablished: "",
        totalFunding: "",
        website: "",
      });
    }
  }, [resetKey]);

  // Update parent state on change
  const handleOrgChange = (index: number, field: string, value: any) => {
    const updatedList = [...orgList];
    updatedList[index] = { ...updatedList[index], [field]: value };
    if (setSectionState) {
      setSectionState(updatedList);
    }
  };

  // Handle adding new organization entry
  const handleAddNewOrgEntry = () => {
    const newEntryWithId = {
      ...newOrgEntry,
      id: `org-${Date.now()}`,
    };
    const updatedList = [...orgList, newEntryWithId];
    if (setSectionState) {
      setSectionState(updatedList);
    }
    // Reset form
    setNewOrgEntry({
      organisationName: "",
      organisationType: "",
      yearEstablished: "",
      totalFunding: "",
      website: "",
    });
    setShowAddOrgForm(false);
  };

  // Handle cancel adding new organization entry
  const handleCancelAddOrgEntry = () => {
    setNewOrgEntry({
      organisationName: "",
      organisationType: "",
      yearEstablished: "",
      totalFunding: "",
      website: "",
    });
    setShowAddOrgForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Organization Table */}
      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-[#DDE3F9]">
              <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">Organisation Name</th>
              <th className="py-3 px-4 text-left text-sm font-normal">Organisation Type</th>
              <th className="py-3 px-4 text-left text-sm font-normal">Year of Establishment</th>
              <th className="py-3 px-4 text-left text-sm font-normal">Total Funding (INR - values is in CRORES)</th>
              <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">Website</th>
            </tr>
          </thead>
          <tbody>
            {orgList.length > 0 ? (
              orgList.map((item, index) => (
                <tr key={item.id || index} className="border-b">
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.5") ? (
                      <Input
                        value={item.organisationName || ""}
                        onChange={(e) => handleOrgChange(index, "organisationName", e.target.value)}
                        className="w-full"
                        placeholder="Enter organisation name"
                      />
                    ) : (
                      item.organisationName || 'N/A'
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.5") ? (
                      <Dropdown
                        options={dropdownValues.issuingAuthorityList}
                        value={item.organisationType || ""}
                        onChange={(value) => handleOrgChange(index, "organisationType", value)}
                        placeholder="Select Type"
                        isEditable={true}
                        resetKey={resetKey || 0}
                        uniqueId={`1.5-organisationType-${index}`}
                      />
                    ) : (
                      item.organisationType || 'N/A'
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.5") ? (
                      <Input
                        type="number"
                        value={item.yearEstablished || ""}
                        onChange={(e) => handleOrgChange(index, "yearEstablished", e.target.value)}
                        className="w-full"
                        placeholder="Enter year"
                      />
                    ) : (
                      item.yearEstablished || 'N/A'
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.5") ? (
                      <Input
                        type="number"
                        value={item.totalFunding || ""}
                        onChange={(e) => handleOrgChange(index, "totalFunding", e.target.value)}
                        className="w-full"
                        placeholder="Enter funding"
                      />
                    ) : (
                      item.totalFunding || 'N/A'
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-normal">
                    {isEditable("1.5") ? (
                      <Input
                        type="url"
                        value={item.website || ""}
                        onChange={(e) => handleOrgChange(index, "website", e.target.value)}
                        className="w-full"
                        placeholder="Enter website"
                      />
                    ) : (
                      item.website || 'N/A'
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  No financial intermediary data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add More Button - Only visible when in edit mode */}
      {isEditable("1.5") && !showAddOrgForm && (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
          onClick={() => setShowAddOrgForm(true)}
        >
          <Plus className="w-4 h-4" />
          Add More
        </Button>
      )}

      {/* Add Organization Form - Only visible when showAddOrgForm is true */}
      {showAddOrgForm && isEditable("1.5") && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-3">Add New Organization</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Organisation Name</Label>
              <Input 
                value={newOrgEntry.organisationName} 
                onChange={(e) => setNewOrgEntry({...newOrgEntry, organisationName: e.target.value})}
                className="bg-white"
                placeholder="Enter organisation name"
              />
            </div>
            <div>
              <Label>Organisation Type</Label>
              <Dropdown
                options={dropdownValues.issuingAuthorityList}
                value={newOrgEntry.organisationType}
                onChange={(value) => setNewOrgEntry({...newOrgEntry, organisationType: value})}
                placeholder="Select Type"
                isEditable={true}
                resetKey={resetKey || 0}
                uniqueId="1.5-new-organisationType"
              />
            </div>
            <div>
              <Label>Year of Establishment</Label>
              <Input
                type="number"
                value={newOrgEntry.yearEstablished}
                onChange={(e) => setNewOrgEntry({...newOrgEntry, yearEstablished: e.target.value})}
                className="bg-white"
                placeholder="Enter year"
              />
            </div>
            <div>
              <Label>Total Funding (INR - values is in CRORES)</Label>
              <Input
                type="number"
                value={newOrgEntry.totalFunding}
                onChange={(e) => setNewOrgEntry({...newOrgEntry, totalFunding: e.target.value})}
                className="bg-white"
                placeholder="Enter funding"
              />
            </div>
            <div>
              <Label>Website</Label>
              <Input
                type="url"
                value={newOrgEntry.website}
                onChange={(e) => setNewOrgEntry({...newOrgEntry, website: e.target.value})}
                className="bg-white"
                placeholder="Enter website"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="default"
              size="sm"
              onClick={handleAddNewOrgEntry}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save Entry
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelAddOrgEntry}
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

