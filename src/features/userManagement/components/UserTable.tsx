import { useState, memo, useEffect } from "react";
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
import { apiService } from "@/services/api.service";

interface UserTableProps {
  officers: NodalOfficer[];
  onEdit: (officer: NodalOfficer) => void;
  onDelete: (id: string) => void;
  onChangePassword?: (officer: NodalOfficer) => void;
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
  onEdit,
  onDelete,
  onChangePassword,
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

  const [ministries, setMinistries] = useState<any[]>([]);
  useEffect(() => {
    apiService.get<any>("/ministries").then((result) => {
      if (Array.isArray(result)) {
        setMinistries(result);
      } else if (result && Array.isArray(result.data)) {
        setMinistries(result.data);
      } else {
        setMinistries([]);
      }
    });
  }, []);

  // Helper to get ministry name by id
  const getMinistryName = (id?: string) => {
    if (!id) return "";
    const ministry = ministries.find((m: any) => m.id === id);
    return ministry ? ministry.name : "";
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
              <SortableHeader field="state">State UT/Ministry</SortableHeader>
            )}
            <TableHead className="text-[#212121] text-xs font-semibold">
              Contact Number
            </TableHead>
            <SortableHeader field="email">Email</SortableHeader>
            {(userRole === "STATE_APPROVER" || userRole === "MINISTRY_APPROVER") && (
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
              {userRole !== "STATE_APPROVER" && (
                <TableCell className="text-xs text-[#212121]">
                  {/* MINISTRY_APPROVER: only ministry */}
                  {officer.role === "MINISTRY_APPROVER" && officer.ministryId && getMinistryName(officer.ministryId)}
                  {officer.role === "NODAL_OFFICER" && officer.ministryId && getMinistryName(officer.ministryId)}
                  {/* STATE_APPROVER: only state */}
                  {officer.role === "STATE_APPROVER" && (officer.stateId || officer.state)}
                  {/* MOSPI_REVIEWER: state and ministry if both, else only state */}
                  {officer.role === "MOSPI_REVIEWER" && (
                    <>
                      {officer.stateId || officer.state}
                      {officer.ministryId && (() => {
                        // Handle multiple ministries (comma-separated)
                        const ministryIds = String(officer.ministryId).split(",").map(m => m.trim()).filter(Boolean);
                        const ministryNames = ministryIds.map(id => getMinistryName(id)).filter(Boolean);
                        return ministryNames.length > 0 ? ` / ${ministryNames.join(", ")}` : "";
                      })()}
                    </>
                  )}
                  {/* fallback for other roles */}
                  {!["MINISTRY_APPROVER","STATE_APPROVER","MOSPI_REVIEWER"].includes(officer.role) && (officer.stateId || officer.state)}
                </TableCell>
              )}
              <TableCell className="text-xs text-[#212121]">+91 {officer.contactNumber}</TableCell>
              <TableCell className="text-xs text-[#212121]">{officer.email}</TableCell>
              {(userRole === "STATE_APPROVER" || userRole === "MINISTRY_APPROVER") && (
                <TableCell className="text-xs text-[#212121]">
                  {(() => {
                    // Debug logging
                    if (officer.role === "NODAL_OFFICER") {
                      console.log('[UserTable] NODAL_OFFICER assignedIndicators:', {
                        officerId: officer.id,
                        officerName: `${officer.firstName} ${officer.lastName}`,
                        assignedIndicators: officer.assignedIndicators,
                        isArray: Array.isArray(officer.assignedIndicators),
                        length: officer.assignedIndicators?.length || 0,
                      });
                    }
                    
                    return officer.role === "NODAL_OFFICER" &&
                      officer.assignedIndicators &&
                      officer.assignedIndicators.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {officer.assignedIndicators.map((indicator, idx) => {
                          // Extract indicator code - handle both object and string formats
                          // (fallback in case data format changes)
                          const indicatorCode = 
                            typeof indicator === 'string' 
                              ? indicator 
                              : indicator?.code || indicator?.id || indicator?.value || String(indicator);
                          
                          // Get status for this indicator
                          const status = officer.indicatorStatuses?.[indicatorCode];
                          const statusUpper = status ? String(status).toUpperCase() : '';
                          
                          // Determine badge color based on status
                          let badgeClassName = "text-xs";
                          if (status && (statusUpper === "ACCEPTED" || statusUpper === "ACCEPTED_BY_MINISTRY" || statusUpper === "ACCEPTED_BY_MOSPI")) {
                            // Green for accepted
                            badgeClassName = "text-xs bg-green-100 text-green-800 border-green-300";
                          } else {
                            // Red for null status, no status, or other statuses (not accepted)
                            badgeClassName = "text-xs bg-red-100 text-red-800 border-red-300";
                          }
                          
                          console.log('[UserTable] Rendering indicator badge:', { indicator, indicatorCode, idx, status, badgeClassName });
                          return (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className={badgeClassName}
                              title={status ? `${indicatorCode} - ${status}` : indicatorCode}
                            >
                              {indicatorCode}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    );
                  })()}
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
                    {userRole === "ADMIN" && onChangePassword && (
                      <DropdownMenuItem onClick={() => onChangePassword(officer)}>
                        <KeyRound className="w-4 h-4 mr-2" />
                        Change password
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
