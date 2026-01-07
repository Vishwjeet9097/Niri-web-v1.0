import { useDropdownStore } from "@/utils/useDropDownStore";
import React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ORGANISATION_TYPE_OPTIONS,
  OWNERSHIP_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  ASSET_TYPE_OPTIONS,
  RATING_OPTIONS,
  SECTOR_OPTIONS,
} from "@/features/submission/constants/steps";
// Dropdown values as arrays
export const dropdownValues = {
  ulbList: [
    {
      value: "c05f8cf3-3a06-438f-9330-9d604e9a0366",
      label: "Pune Municipal Corporation",
    },
    {
      value: "a12b7e21-1b2c-4d3e-8f9a-123456789abc",
      label: "Mumbai Municipal Corporation",
    },
    {
      value: "b23c8d34-2c3d-5e4f-9a0b-abcdef123456",
      label: "Nagpur Municipal Corporation",
    },
  ],

  ratingList: RATING_OPTIONS,

  bondTypeList: ["Municipal", "Green", "Other"],

  cityList: ["Mumbai", "Pune", "Nagpur", "Nashik"],

  issuingAuthorityList: ORGANISATION_TYPE_OPTIONS,

  sector: SECTOR_OPTIONS,

  projectType: PROJECT_TYPE_OPTIONS,

  assetType: ASSET_TYPE_OPTIONS,

  ownership: OWNERSHIP_OPTIONS,
};

import { useState, useMemo } from "react";

export const Dropdown = ({
  options,
  value,
  onChange,
  placeholder = "Select option",
  isEditable = true,
  resetKey = 0,
  isSearchable = false,
}: {
  options: { value: string; label: string; disabled?: boolean }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isEditable?: boolean;
  resetKey?: number;
  isSearchable?: boolean;
}) => {
  const [search, setSearch] = useState("");
  const filteredOptions = useMemo(() => {
    if (!isSearchable || !search) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search, isSearchable]);

  return (
    <Select
      key={`dropdown-${resetKey}`}
      value={value}
      onValueChange={onChange}
      disabled={!isEditable}
    >
      <SelectTrigger className={!isEditable ? "bg-gray-50" : "bg-white"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {isSearchable && (
          <div className="px-2 py-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1 border rounded text-sm mb-1"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))
        ) : (
          <div className="px-2 py-2 text-muted-foreground text-sm">
            No options found
          </div>
        )}
      </SelectContent>
    </Select>
  );
};
