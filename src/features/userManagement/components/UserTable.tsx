import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { NodalOfficer } from "../services/userManagement.service";
import { Badge } from "@/components/ui/badge";
import { getRoleDisplayName } from "@/utils/roles";
import { State } from "@/services/states.service";

interface UserTableProps {
  officers: NodalOfficer[];
  onEdit: (officer: NodalOfficer) => void;
  onDelete: (id: string) => void;
  onAssignIndicator: (id: string, indicator: string) => void;
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  sortField?: "firstName" | "role" | "state" | "email";
  sortDirection?: "asc" | "desc";
  onSort?: (field: "firstName" | "role" | "state" | "email") => void;
  states?: State[];
}

export function UserTable({
  officers,
  onEdit,
  onDelete,
  onAssignIndicator,
  selectedIds,
  onSelectionChange,
  sortField,
  sortDirection,
  onSort,
  states = [],
}: UserTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(officers.map((o) => o.id)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    onSelectionChange(newSelected);
  };

  const allSelected =
    officers.length > 0 && selectedIds.size === officers.length;

  // Helper function to get state name from stateId or state
  const getStateName = (officer: NodalOfficer): string => {
    // Handle if state is an array (multiple states)
    if (Array.isArray(officer.state)) {
      if (officer.state.length === 0) {
        return "N/A";
      }
      // Map array of IDs to state names
      if (states.length > 0) {
        const stateNames = officer.state
          .map((stateId: string | number) => {
            const state = states.find(
              (s) => s.id === String(stateId) || s.name === String(stateId)
            );
            return state ? state.name : null;
          })
          .filter((name: string | null) => name !== null);
        return stateNames.length > 0
          ? stateNames.join(", ")
          : officer.state.join(", ");
      }
      return officer.state.join(", ");
    }

    // Handle if state is a string that looks like an array representation
    if (typeof officer.state === "string") {
      // Check if it's a JSON string representation of an array
      if (
        officer.state.trim().startsWith("[") ||
        officer.state.trim().startsWith("{")
      ) {
        try {
          const parsed = JSON.parse(officer.state);
          if (Array.isArray(parsed)) {
            if (states.length > 0) {
              const stateNames = parsed
                .map((stateId: string | number) => {
                  const state = states.find(
                    (s) =>
                      s.id === String(stateId) || s.name === String(stateId)
                  );
                  return state ? state.name : null;
                })
                .filter((name: string | null) => name !== null);
              return stateNames.length > 0
                ? stateNames.join(", ")
                : parsed.join(", ");
            }
            return parsed.join(", ");
          }
        } catch (e) {
          // If parsing fails, try to extract IDs from string like {"1","2","3","4"}
          // This handles cases where the string is not valid JSON but contains IDs
          const trimmedState = officer.state.trim();
          const idMatches = trimmedState.match(/"(\d+)"/g);
          if (idMatches && states.length > 0) {
            const stateIds = idMatches.map((match) => match.replace(/"/g, ""));
            const stateNames = stateIds
              .map((stateId: string) => {
                const state = states.find(
                  (s) => s.id === stateId || s.name === stateId
                );
                return state ? state.name : null;
              })
              .filter((name: string | null) => name !== null);
            return stateNames.length > 0
              ? stateNames.join(", ")
              : stateIds.join(", ");
          }
        }
      }

      // Try to extract numeric IDs from string patterns like "1,2,3,4" or "1 2 3 4" or {"1","2","3","4"}
      const trimmedState = officer.state.trim();
      const numericIds = trimmedState.match(/\d+/g);
      if (numericIds && numericIds.length > 1 && states.length > 0) {
        const stateNames = numericIds
          .map((stateId: string) => {
            const state = states.find(
              (s) => s.id === stateId || s.name === stateId
            );
            return state ? state.name : null;
          })
          .filter((name: string | null) => name !== null);
        if (stateNames.length > 0) {
          return stateNames.join(", ");
        }
      }

      // If it's a normal string (state name), return it
      if (officer.state.trim() !== "") {
        // Check if it's actually a state ID that needs mapping
        if (states.length > 0) {
          const state = states.find(
            (s) => s.id === officer.state || s.name === officer.state
          );
          if (state) {
            return state.name;
          }
        }
        return officer.state;
      }
    }

    // If state is not available, try to map stateId to state name
    if (officer.stateId && states.length > 0) {
      // Handle stateId as array
      if (Array.isArray(officer.stateId)) {
        const stateNames = officer.stateId
          .map((id: string | number) => {
            const state = states.find(
              (s) => s.id === String(id) || s.name === String(id)
            );
            return state ? state.name : null;
          })
          .filter((name: string | null) => name !== null);
        return stateNames.length > 0
          ? stateNames.join(", ")
          : officer.stateId.join(", ");
      }

      // Handle stateId as string
      const state = states.find(
        (s) =>
          s.id === String(officer.stateId) || s.name === String(officer.stateId)
      );
      if (state) {
        return state.name;
      }
    }

    // Fallback
    if (officer.stateId) {
      return Array.isArray(officer.stateId)
        ? officer.stateId.join(", ")
        : String(officer.stateId);
    }

    return officer.state ? String(officer.state) : "N/A";
  };

  // Sortable header component
  const SortableHeader = ({
    field,
    children,
  }: {
    field: "firstName" | "role" | "state" | "email";
    children: React.ReactNode;
  }) => {
    if (!onSort) return <TableHead>{children}</TableHead>;

    return (
      <TableHead
        className="cursor-pointer hover:bg-muted/50 select-none text-[#212121] text-xs font-semibold"
        onClick={() => onSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {sortField === field &&
            (sortDirection === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            ))}
        </div>
      </TableHead>
    );
  };

  return (
    <div className="border rounded-lg bg-card">
      <Table>
        <TableHeader className="bg-[#F3F3F3]">
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead className="w-20 text-[#212121] text-xs font-semibold">
              S.no.
            </TableHead>
            <SortableHeader field="firstName">Officer Name</SortableHeader>
            <SortableHeader field="role">Role</SortableHeader>
            <SortableHeader field="state">State/UT</SortableHeader>
            <TableHead className="text-[#212121] text-xs font-semibold">
              Contact Number
            </TableHead>
            <SortableHeader field="email">Email</SortableHeader>
            {/* <TableHead>Assigned Indicator</TableHead> */}
            <TableHead className="w-24 text-[#212121] text-xs font-semibold">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {officers.map((officer, index) => (
            <TableRow key={officer.id}>
              <TableCell className="text-xs text-[#212121]">
                <Checkbox
                  checked={selectedIds.has(officer.id)}
                  onCheckedChange={(checked) =>
                    handleSelectOne(officer.id, checked as boolean)
                  }
                />
              </TableCell>
              <TableCell className="font-medium text-xs text-[#212121]">
                {index + 1}
              </TableCell>
              <TableCell className="font-medium text-xs text-[#212121]">
                {officer.firstName} {officer.lastName}
              </TableCell>
              <TableCell className="text-xs text-[#212121]">
                <Badge variant="secondary">
                  {getRoleDisplayName(officer.role)}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-[#212121]">
                {getStateName(officer)}
              </TableCell>
              <TableCell className="text-xs text-[#212121]">
                +91 {officer.contactNumber}
              </TableCell>
              <TableCell className="text-xs text-[#212121]">
                {officer.email}
              </TableCell>
              {/* <TableCell>
                {officer.assignedIndicator ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-primary text-primary-foreground">
                      Assigned
                    </Badge>
                    <Select
                      value={officer.assignedIndicator}
                      onValueChange={(value) =>
                        onAssignIndicator(officer.id, value)
                      }
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Indicator 1">Indicator 1</SelectItem>
                        <SelectItem value="Indicator 2">Indicator 2</SelectItem>
                        <SelectItem value="Indicator 3">Indicator 3</SelectItem>
                        <SelectItem value="Indicator 4">Indicator 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Select
                    value=""
                    onValueChange={(value) =>
                      onAssignIndicator(officer.id, value)
                    }
                  >
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="Select Indicator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Indicator 1">Indicator 1</SelectItem>
                      <SelectItem value="Indicator 2">Indicator 2</SelectItem>
                      <SelectItem value="Indicator 3">Indicator 3</SelectItem>
                      <SelectItem value="Indicator 4">Indicator 4</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </TableCell> */}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(officer)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(officer.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
