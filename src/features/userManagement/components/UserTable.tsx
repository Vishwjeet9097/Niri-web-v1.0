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
import { MoreVertical, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { NodalOfficer } from "../services/userManagement.service";
import { Badge } from "@/components/ui/badge";

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

  const allSelected = officers.length > 0 && selectedIds.size === officers.length;

  // Sortable header component
  const SortableHeader = ({ field, children }: { field: "firstName" | "role" | "state" | "email", children: React.ReactNode }) => {
    if (!onSort) return <TableHead>{children}</TableHead>;
    
    return (
      <TableHead 
        className="cursor-pointer hover:bg-muted/50 select-none"
        onClick={() => onSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {sortField === field && (
            sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </TableHead>
    );
  };

  return (
    <div className="border rounded-lg bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead className="w-20">S.no.</TableHead>
            <SortableHeader field="firstName">Officer Name</SortableHeader>
            <SortableHeader field="role">Role</SortableHeader>
            <SortableHeader field="state">State/UT</SortableHeader>
            <TableHead>Contact Number</TableHead>
            <SortableHeader field="email">Email</SortableHeader>
            {/* <TableHead>Assigned Indicator</TableHead> */}
            <TableHead className="w-24">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {officers.map((officer, index) => (
            <TableRow key={officer.id}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(officer.id)}
                  onCheckedChange={(checked) =>
                    handleSelectOne(officer.id, checked as boolean)
                  }
                />
              </TableCell>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell className="font-medium">
                {officer.firstName} {officer.lastName}
              </TableCell>
              <TableCell>{officer.role}</TableCell>
              <TableCell>{officer.stateId || officer.state}</TableCell>
              <TableCell>+91 {officer.contactNumber}</TableCell>
              <TableCell>{officer.email}</TableCell>
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
