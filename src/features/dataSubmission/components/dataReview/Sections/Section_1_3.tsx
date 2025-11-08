import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown, dropdownValues } from "@/utils/getDropDowns";

interface Section1_3Props {
  formData: any;
  isEditable: (sectionId: string) => boolean;
  setSectionState?: (state: { totalULBs: number; ulbList: any[] }) => void;
}


export const Section_1_3 = ({ formData, isEditable, setSectionState }: Section1_3Props) => {
  const ulbList = formData?.section1_3?.ulbList || [];
  const totalULBs = formData?.section1_3?.totalULBs || 0;

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

      {/* ULB List */}
      {ulbList.length > 0 ? (
        ulbList.map((item, index) => (
          <div key={item.id || index}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>City Name</Label>
                <Input
                  value={item.cityName || ""}
                  readOnly={!isEditable("1.3")}
                  className={isEditable("1.3") ? "bg-white" : "bg-gray-50"}
                  onChange={(e) => handleUlbChange(index, "cityName", e.target.value)}
                />
              </div>

              <div>
                <Label>ULB</Label>
                <Dropdown
                  options={dropdownValues.ulbList}
                  value={item.ulb || ""}
                  onChange={(value) => handleUlbChange(index, "ulb", value)}
                  placeholder="Select ULB"
                  isEditable={isEditable("1.3")}
                />
              </div>

              <div>
                <Label>Rating Date</Label>
                <Input
                  type={isEditable("1.3") ? "date" : "text"}
                  value={item.ratingDate || ""}
                  readOnly={!isEditable("1.3")}
                  className={isEditable("1.3") ? "bg-white" : "bg-gray-50 cursor-not-allowed"}
                  onChange={isEditable("1.3") ? (e) => handleUlbChange(index, "ratingDate", e.target.value) : undefined}
                />
              </div>

              <div>
                <Label>Rating</Label>
                <Dropdown
                  options={dropdownValues.ratingList}
                  value={item.rating || ""}
                  onChange={(value) => handleUlbChange(index, "rating", value)}
                  placeholder="Select Rating"
                  isEditable={isEditable("1.3")}
                />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center text-muted-foreground py-4">
          No ULB data available
        </div>
      )}
    </div>
  );
};

