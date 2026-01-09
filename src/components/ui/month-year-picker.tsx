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

  // Sync local state with value prop when it changes externally
  React.useEffect(() => {
    const parsed = parseValue(value);
    setLocalMonth(parsed.month);
    setLocalYear(parsed.year);
  }, [value]);

  const selectedMonth = localMonth;
  const selectedYear = localYear;

  // Generate month options (01-12)
  const months = Array.from({ length: 12 }, (_, i) => {
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
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => {
    const year = currentYear - 10 + i;
    const yearShort = String(year).slice(-2); // Last 2 digits
    return { value: yearShort, label: String(year) };
  });

  const handleMonthChange = (month: string) => {
    setLocalMonth(month);
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
    if (localMonth) {
      // If month is already selected, update the value immediately
      const newValue = `${localMonth}/${year}`;
      onChange?.(newValue);
    }
    // If month is not selected yet, just update local state
    // The value will be updated when month is selected
  };

  // Auto-close when both month and year are selected
  React.useEffect(() => {
    if (selectedMonth && selectedYear && open) {
      // Small delay to allow the value to update
      const timer = setTimeout(() => {
        setOpen(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedMonth, selectedYear, open]);

  const displayValue = value || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
