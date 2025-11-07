import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown, dropdownValues } from "@/utils/getDropDowns";

interface Section1_4Props {
  formData: any;
  isEditable: (sectionId: string) => boolean;
  setBondTypes?: (types: string[]) => void;
  setCityNames?: (names: string[]) => void;
  setIssuingAuthorities?: (auths: string[]) => void;
  setBondValues?: (values: number[]) => void;
  setTotalULBs?: (val: number) => void;
}


export const Section_1_4 = ({ formData, isEditable, setBondTypes, setCityNames, setIssuingAuthorities, setBondValues, setTotalULBs }: Section1_4Props) => {
  const bondList = formData?.section1_4?.bondList || [];
  const totalULBs = formData?.section1_4?.totalULBs || 0;

  // Handlers for each field
  const handleBondTypeChange = (index: number, value: string) => {
    const updated = [...bondList.map((item: any) => item.bondType || "")];
    updated[index] = value;
    setBondTypes && setBondTypes(updated);
  };
  const handleCityNameChange = (index: number, value: string) => {
    const updated = [...bondList.map((item: any) => item.cityName || "")];
    updated[index] = value;
    setCityNames && setCityNames(updated);
  };
  const handleIssuingAuthorityChange = (index: number, value: string) => {
    const updated = [...bondList.map((item: any) => item.issuingAuthority || "")];
    updated[index] = value;
    setIssuingAuthorities && setIssuingAuthorities(updated);
  };
  const handleBondValueChange = (index: number, value: number) => {
    const updated = [...bondList.map((item: any) => item.value || 0)];
    updated[index] = value;
    setBondValues && setBondValues(updated);
  };
  const handleTotalULBsChange = (value: number) => {
    setTotalULBs && setTotalULBs(value);
  };

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
          onChange={(e) => handleTotalULBsChange(Number(e.target.value))}
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
                  onChange={(value) => handleBondTypeChange(index, value)}
                  placeholder="Select Bond Type"
                  isEditable={isEditable("1.4")}
                />
              </div>

              <div>
                <Label>City</Label>
                <Dropdown
                  options={dropdownValues.cityList}
                  value={item.cityName || ""}
                  onChange={(value) => handleCityNameChange(index, value)}
                  placeholder="Select City"
                  isEditable={isEditable("1.4")}
                />
              </div>

              <div>
                <Label>Issuing Authority</Label>
                <Dropdown
                  options={dropdownValues.issuingAuthorityList}
                  value={item.issuingAuthority || ""}
                  onChange={(value) => handleIssuingAuthorityChange(index, value)}
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
                  onChange={(e) => handleBondValueChange(index, Number(e.target.value))}
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


