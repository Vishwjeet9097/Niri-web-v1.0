import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MonthYearPickerProps {
  value?: string; // Format: MM/YY (e.g., "07/26")
  onChange?: (value: string) => void; // Returns MM/YY format
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MonthYearPicker({
  value,
  onChange,
  placeholder = "Select month/year",
  disabled = false,
  className,
}: MonthYearPickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse MM/YY or MMYY format to month and year
  const parseValue = (val?: string): { month: string; year: string } => {
    if (!val) {
      return { month: "", year: "" };
    }

    // Handle MM/YY format (e.g., "07/26")
    if (val.includes("/") && val.length === 5) {
      const [month, year] = val.split("/");
      return { month, year };
    }

    // Handle MMYY format (e.g., "0726" or "1224")
    if (val.length === 4 && /^\d{4}$/.test(val)) {
      const month = val.slice(0, 2);
      const year = val.slice(2, 4);
      return { month, year };
    }

    return { month: "", year: "" };
  };

  const parsed = parseValue(value);
  // Use local state to track selections independently
  const [localMonth, setLocalMonth] = React.useState(parsed.month);
  const [localYear, setLocalYear] = React.useState(parsed.year);
  // Track if user has made a new selection (to prevent auto-close on edit)
  const [hasNewSelection, setHasNewSelection] = React.useState(false);

  // Sync local state with value prop when it changes externally
  React.useEffect(() => {
    const parsed = parseValue(value);
    setLocalMonth(parsed.month);
    setLocalYear(parsed.year);
    // Reset selection flag when value changes externally
    setHasNewSelection(false);
  }, [value]);

  const selectedMonth = localMonth;
  const selectedYear = localYear;

  // Convert selected year (YY format) to full year (YYYY)
  // Handle both 2-digit years: assume 20XX for years 00-99
  const getFullYear = (yy: string): number => {
    const yearNum = parseInt(yy);
    // If year is 0-99, assume 2000-2099
    return 2000 + yearNum;
  };

  // Generate month options (01-12), but limit to current month if current year is selected
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11, so add 1
  
  const selectedYearFull = selectedYear ? getFullYear(selectedYear) : null;
  
  // If current year is selected, only show months up to current month
  const maxMonth = selectedYearFull === currentYear ? currentMonth : 12;
  
  const months = Array.from({ length: maxMonth }, (_, i) => {
    const monthNum = String(i + 1).padStart(2, "0");
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return { value: monthNum, label: monthNames[i] };
  });

  // Generate year options (current year - 10 to current year only, no future years)
  const years = Array.from({ length: 11 }, (_, i) => {
    const year = currentYear - 10 + i;
    const yearShort = String(year).slice(-2); // Last 2 digits
    return { value: yearShort, label: String(year) };
  });

  // Clear month if it becomes invalid when year changes (e.g., future month in current year)
  React.useEffect(() => {
    if (selectedYear && selectedMonth) {
      const selectedYearFull = getFullYear(selectedYear);
      const selectedMonthNum = parseInt(selectedMonth);
      
      // If current year is selected and month is in the future, clear it
      if (selectedYearFull === currentYear && selectedMonthNum > currentMonth) {
        setLocalMonth("");
        // Only clear if the current value is not already empty to prevent infinite loops
        if (value) {
          onChange?.(""); // Clear the value
        }
      }
    }
  }, [selectedYear, selectedMonth, currentYear, currentMonth, value, onChange]);

  const handleMonthChange = (month: string) => {
    setLocalMonth(month);
    setHasNewSelection(true); // Mark that user made a selection
    if (localYear) {
      // If year is already selected, update the value immediately
      const newValue = `${month}/${localYear}`;
      onChange?.(newValue);
    }
    // If year is not selected yet, just update local state
    // The value will be updated when year is selected
  };

  const handleYearChange = (year: string) => {
    setLocalYear(year);
    setHasNewSelection(true); // Mark that user made a selection
    
    // Check if current month is valid for the selected year
    if (localMonth) {
      const selectedYearFull = getFullYear(year);
      const selectedMonthNum = parseInt(localMonth);
      
      // If current year is selected and month is in the future, clear it
      if (selectedYearFull === currentYear && selectedMonthNum > currentMonth) {
        setLocalMonth("");
        onChange?.(""); // Clear the value
      } else {
        // If month is valid, update the value immediately
        const newValue = `${localMonth}/${year}`;
        onChange?.(newValue);
      }
    }
    // If month is not selected yet, just update local state
    // The value will be updated when month is selected
  };

  // Auto-close only when both month and year are selected AND user made a new selection
  // This prevents auto-closing when opening the picker to edit an existing value
  React.useEffect(() => {
    if (selectedMonth && selectedYear && open && hasNewSelection) {
      // Small delay to allow the value to update
      const timer = setTimeout(() => {
        setOpen(false);
        setHasNewSelection(false); // Reset after closing
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedMonth, selectedYear, open, hasNewSelection]);

  // Reset selection flag when popover closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setHasNewSelection(false);
    }
  };

  const displayValue = value || placeholder;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="flex gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Month</Label>
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Year</Label>
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {selectedMonth && selectedYear && (
          <div className="mt-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange?.("");
                setOpen(false);
              }}
            >
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
