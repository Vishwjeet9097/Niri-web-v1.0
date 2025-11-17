import { useDropdownStore } from '@/utils/useDropDownStore';
import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

// Dropdown values as arrays
export const dropdownValues = {
  ulbList: [
    "Pune Municipal Corporation",
    "Mumbai Municipal Corporation",
    "Nagpur Municipal Corporation"
  ],

  ratingList: [
    "AA+",
    "AA",
    "A+",
    "A",
    "BBB+"
  ],

  bondTypeList: [
    "Municipal bond",
    "Infrastructure bond",
    "Revenue bond"
  ],

  cityList: [
    "Mumbai",
    "Pune",
    "Nagpur",
    "Nashik"
  ],

  issuingAuthorityList: [
    "Authority Name",
    "Municipal Corporation",
    "Development Authority"
  ],

  sector: [
    "Roads & Bridges",
    "Water Supply",
    "Sanitation",
    "Urban Transport",
    "Energy",
    "Health",
    "Education",
    "Other",
  ],

  projectType: ["BOT", "BOOT", "HAM", "EPC", "Other"],

  ownership: [
    "Asset ownership",
    "Revenue sharing",
    "Management contract",
    "Other",
  ]

};

export const Dropdown = ({
  options,
  value,
  onChange,
  placeholder = "Select option",
  isEditable = true,
  resetKey = 0
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isEditable?: boolean;
  resetKey?: number;
}) => {
  return (
    <Select
      key={`dropdown-${resetKey}`}
      value={value}
      onValueChange={onChange}
      disabled={!isEditable}
    >
      <SelectTrigger className={!isEditable ? 'bg-gray-50' : 'bg-white'}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};