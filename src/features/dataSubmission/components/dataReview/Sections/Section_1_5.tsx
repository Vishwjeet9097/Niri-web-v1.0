import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown, dropdownValues } from "@/utils/getDropDowns";

interface Section1_5Props {
  formData: any;
  isEditable: (sectionId: string) => boolean;
  setSectionState?: (state: any[]) => void;
}

export const Section_1_5 = ({ formData, isEditable, setSectionState }: Section1_5Props) => {
  const orgList = formData?.section1_5 || [];

  // Update parent state on change
  const handleOrgChange = (index: number, field: string, value: any) => {
    const updatedList = [...orgList];
    updatedList[index] = { ...updatedList[index], [field]: value };
    if (setSectionState) {
      setSectionState(updatedList);
    }
  };

  return (
    <div className="space-y-4">
      {orgList.length > 0 ? (
        orgList.map((item, index) => (
          <div key={item.id || index}>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>Organisation Name</Label>
                <Input
                  value={item.organisationName || ""}
                  readOnly={!isEditable("1.5")}
                  className={isEditable("1.5") ? "bg-white" : "bg-gray-50"}
                  onChange={(e) => handleOrgChange(index, "organisationName", e.target.value)}
                />
              </div>

              <div>
                <Label>Organisation Type</Label>
                <Dropdown
                  options={dropdownValues.issuingAuthorityList}
                  value={item.organisationType || ""}
                  onChange={(value) => handleOrgChange(index, "organisationType", value)}
                  placeholder="Select Type"
                  isEditable={isEditable("1.5")}
                />
              </div>

              <div>
                <Label>Year of Establishment</Label>
                <Input
                  type="number"
                  value={item.yearEstablished || ""}
                  readOnly={!isEditable("1.5")}
                  className={isEditable("1.5") ? "bg-white" : "bg-gray-50"}
                  onChange={(e) => handleOrgChange(index, "yearEstablished", e.target.value)}
                />
              </div>

              <div>
                <Label>Total Funding (₹ Crores)</Label>
                <Input
                  type="number"
                  value={item.totalFunding || ""}
                  readOnly={!isEditable("1.5")}
                  className={isEditable("1.5") ? "bg-white" : "bg-gray-50"}
                  onChange={(e) => handleOrgChange(index, "totalFunding", Number(e.target.value))}
                />
              </div>

              <div>
                <Label>Website</Label>
                <Input
                  type="url"
                  value={item.website || ""}
                  readOnly={!isEditable("1.5")}
                  className={isEditable("1.5") ? "bg-white" : "bg-gray-50"}
                  onChange={(e) => handleOrgChange(index, "website", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center text-muted-foreground py-4">
          No financial intermediary data available
        </div>
      )}
    </div>
  );
};

