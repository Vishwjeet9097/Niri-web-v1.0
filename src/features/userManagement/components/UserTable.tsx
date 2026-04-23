import { useState, memo } from "react";
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
  KeyRound,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { NodalOfficer } from "../services/userManagement.service";
import { Badge } from "@/components/ui/badge";
import { getRoleDisplayName } from "@/utils/roles";

interface UserTableProps {
  officers: NodalOfficer[];
  serialNumberStart?: number;
  onEdit: (officer: NodalOfficer) => void;
  onChangePassword: (officer: NodalOfficer) => void;
  canChangePassword?: (officer: NodalOfficer) => boolean;
  onDelete: (id: string) => void;
  onAssignIndicator: (id: string, indicator: string) => void;
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  sortField?: "firstName" | "role" | "state" | "email";
  sortDirection?: "asc" | "desc";
  onSort?: (field: "firstName" | "role" | "state" | "email") => void;
  userRole?: string;
}

function UserTableComponent({
  officers,
  serialNumberStart = 0,
  onEdit,
  onChangePassword,
  canChangePassword,
  onDelete,
  onAssignIndicator,
  selectedIds,
  onSelectionChange,
  sortField,
  sortDirection,
  onSort,
  userRole,
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
            {userRole !== "STATE_APPROVER" && (
              <SortableHeader field="state">State/UT</SortableHeader>
            )}
            <TableHead className="text-[#212121] text-xs font-semibold">
              Contact Number
            </TableHead>
            <SortableHeader field="email">Email</SortableHeader>
            {userRole === "STATE_APPROVER" && (
              <TableHead className="text-[#212121] text-xs font-semibold">
                Assigned Indicators
              </TableHead>
            )}
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
                {serialNumberStart + index + 1}
              </TableCell>
              <TableCell className="font-medium text-xs text-[#212121]">
                {officer.firstName} {officer.lastName}
              </TableCell>
              <TableCell className="text-xs text-[#212121]">
                <Badge variant="secondary">
                  {getRoleDisplayName(officer.role)}
                </Badge>
              </TableCell>
              {userRole !== "STATE_APPROVER" && (
                <TableCell className="text-xs text-[#212121]">
                  {officer.stateId || officer.state}
                </TableCell>
              )}
              <TableCell className="text-xs text-[#212121]">
                +91 {officer.contactNumber}
              </TableCell>
              <TableCell className="text-xs text-[#212121]">
                {officer.email}
              </TableCell>
              {userRole === "STATE_APPROVER" && (
                <TableCell className="text-xs text-[#212121]">
                  {officer.role === "NODAL_OFFICER" &&
                  officer.assignedIndicators &&
                  officer.assignedIndicators.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {officer.assignedIndicators.map((indicator, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs"
                        >
                          {indicator}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              )}
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
                    {canChangePassword?.(officer) && (
                      <DropdownMenuItem onClick={() => onChangePassword(officer)}>
                        <KeyRound className="w-4 h-4 mr-2" />
                        Change Password
                      </DropdownMenuItem>
                    )}
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

// Memoize UserTable to prevent unnecessary re-renders when props haven't changed
export const UserTable = memo(UserTableComponent);
