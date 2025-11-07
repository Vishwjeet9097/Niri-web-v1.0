import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown, dropdownValues } from "@/utils/getDropDowns";

interface Section1_4Props {
  formData: any;
  isEditable: (sectionId: string) => boolean;
}

export const Section_1_4 = ({ formData, isEditable }: Section1_4Props) => {
  const [bondList, setBondList] = useState<any[]>(formData?.section1_4?.bondList || []);
  const [totalULBs, setTotalULBs] = useState<number>(formData?.section1_4?.totalULBs || 0);

  useEffect(() => {
    setBondList(formData?.section1_4?.bondList || []);
    setTotalULBs(formData?.section1_4?.totalULBs || 0);
  }, [formData]);

  const handleBondChange = (index: number, field: string, value: any) => {
    const updatedBondList = [...bondList];
    updatedBondList[index] = { ...updatedBondList[index], [field]: value };
    setBondList(updatedBondList);
  };

  // Assume you have:
// - formData: parent state
// - setFormData: parent state setter
// - formDataState: local state for editing (optional)
// - setFormDataState: local state setter (optional)

  return (
    <div className="space-y-4">
      {/* ✅ Total ULBs */}
      <div className="max-w-xs">
        <Label>Total Number of ULBs</Label>
        <Input
          type="number"
          value={totalULBs}
          readOnly={!isEditable("1.4")}
          className={isEditable("1.4") ? "bg-white" : "bg-gray-50"}
        />
      </div>

      {/* ✅ Bond List */}
      {bondList.length > 0 ? (
        bondList.map((item, index) => (
          <div key={item.id || index}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Bond Type</Label>
                <Dropdown
                  options={dropdownValues.bondTypeList}
                  value={item.bondType || ""}
                  onChange={(value) => handleBondChange(index, "bondType", value)}
                  placeholder="Select Bond Type"
                  isEditable={isEditable("1.4")}
                />
              </div>

              <div>
                <Label>City</Label>
                <Dropdown
                  options={dropdownValues.cityList}
                  value={item.cityName || ""}
                  onChange={(value) => handleBondChange(index, "cityName", value)}
                  placeholder="Select City"
                  isEditable={isEditable("1.4")}
                />
              </div>

              <div>
                <Label>Issuing Authority</Label>
                <Dropdown
                  options={dropdownValues.issuingAuthorityList}
                  value={item.issuingAuthority || ""}
                  onChange={(value) => handleBondChange(index, "issuingAuthority", value)}
                  placeholder="Select Authority"
                  isEditable={isEditable("1.4")}
                />
              </div>

              <div>
                <Label>Value (₹ Crores)</Label>
                <Input
                  type="number"
                  value={item.value || ""}
                  readOnly={!isEditable("1.4")}
                  className={isEditable("1.4") ? "bg-white" : "bg-gray-50"}
                  onChange={(e) => handleBondChange(index, "value", Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center text-muted-foreground py-4">
          No bond data available
        </div>
      )}
    </div>
  );
};


