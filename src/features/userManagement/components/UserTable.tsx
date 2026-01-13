import { useState, useEffect, useRef } from "react";
import { useCallback } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
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
import { getRoleDisplayName } from "@/utils/roles";
import { apiService } from "@/services/api.service";
import { getRemainingMinistryIndicators } from "@/services/ministry.service";

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
  const { user } = useAuth();
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
        className="cursor-pointer hover:bg-muted/50 select-none text-[#212121] text-xs font-semibold"  
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

  const ids = id
    .split(",")
    .map((i) => i.trim())
    .filter(Boolean);

  const names = ids
    .map((ministryId) =>
      ministries.find((m: any) => m.id === ministryId)?.name
    )
    .filter(Boolean);

  return names.join(", ");
};




// State to hold assigned indicators for all officers


type AssignedIndicatorsMap = { [userId: string]: string };
type AssignedIndicatorsLoadingMap = { [userId: string]: boolean };

// In the UserTable component:

const [assignedIndicators, setAssignedIndicators] = useState<AssignedIndicatorsMap>({});
const [assignedIndicatorsLoading, setAssignedIndicatorsLoading] = useState<AssignedIndicatorsLoadingMap>({});
const fetchedRef = useRef<Set<string>>(new Set());

useEffect(() => {
  // Reset fetchedRef when officers list changes (to handle dynamic lists)
  fetchedRef.current = new Set();
  setAssignedIndicators({});
  officers.forEach((officer) => {
    if (!officer.id) return;
    fetchedRef.current.add(officer.id);
    setAssignedIndicatorsLoading((prev) => ({ ...prev, [officer.id]: true }));
    getRemainingMinistryIndicators(officer.id).then((result) => {
      let sNoString = "";
       // result is the data object directly (not wrapped in .data)
      if (result && typeof result === "object") {
        const allSnos: string[] = [];
        Object.values(result).forEach((sectionArr) => {
          if (Array.isArray(sectionArr)) {
            sectionArr.forEach((item) => {
              if (item && item.sNo) allSnos.push(String(item.sNo));
            });
          }
        });
        // Add extra spacing between sNo values (e.g., 1.2      2.3      4.3)
        sNoString = allSnos.join("      ");
      }
      setAssignedIndicators((prev) => ({ ...prev, [officer.id]: sNoString }));
      setAssignedIndicatorsLoading((prev) => ({ ...prev, [officer.id]: false }));
    }).catch((err) => {
      console.error("[ERROR] getRemainingMinistryIndicators failed for", officer.id, err);
      setAssignedIndicators((prev) => ({ ...prev, [officer.id]: "" }));
      setAssignedIndicatorsLoading((prev) => ({ ...prev, [officer.id]: false }));
    });
  });
}, [officers]);


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
            <TableHead className="w-20 text-[#212121] text-xs font-semibold">S.no.</TableHead>
            <SortableHeader field="firstName">Officer Name</SortableHeader>
            <SortableHeader field="role">Role</SortableHeader>
            <SortableHeader field="state">State UT/Ministry</SortableHeader>
            <TableHead className="text-[#212121] text-xs font-semibold">Contact Number</TableHead>
            <SortableHeader field="email">Email</SortableHeader>
            
            {user?.role === "MINISTRY_APPROVER" && (
              <SortableHeader field="email">Assigned Indicators</SortableHeader>
            )}
            {/* <TableHead>Assigned Indicator</TableHead> */}
            <TableHead className="w-24 text-[#212121] text-xs font-semibold">Action</TableHead>
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
              <TableCell className="font-medium text-xs text-[#212121]">{index + 1}</TableCell>
              <TableCell className="font-medium text-xs text-[#212121]">
                {officer.firstName} {officer.lastName}
              </TableCell>
              <TableCell className="text-xs text-[#212121]">
                <Badge variant="secondary">
                  {getRoleDisplayName(officer.role)}
                </Badge>
              </TableCell>
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
                    {(officer.state && officer.ministryId) ?  '/' : ""} 
                    {officer.ministryId && getMinistryName(officer.ministryId)
                      ? `  ${getMinistryName(officer.ministryId)}`
                      : ""}
                  </>
                )}
                {/* fallback for other roles */}
                {!["MINISTRY_APPROVER","STATE_APPROVER","MOSPI_REVIEWER"].includes(officer.role) && (officer.stateId || officer.state)}
              </TableCell>
              <TableCell className="text-xs text-[#212121]">+91 {officer.contactNumber}</TableCell>
              <TableCell className="text-xs text-[#212121]">{officer.email}</TableCell>
              <TableCell className="text-xs text-[#212121]">
                {user?.role === "MINISTRY_APPROVER" ? (
                  assignedIndicatorsLoading[officer.id] ? (
                    <span style={{ color: '#888' }}>Loading...</span>
                  ) : assignedIndicators[officer.id] ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {assignedIndicators[officer.id].split(/\s+/).filter(Boolean).map((sNo, idx) => (
                        <span
                          key={sNo + idx}
                          style={{
                            background: '#E0E7FF',
                            color: '#3730A3',
                            borderRadius: '12px',
                            padding: '2px 10px',
                            fontSize: '12px',
                            fontWeight: 500,
                            display: 'inline-block',
                          }}
                        >
                          {sNo}
                        </span>
                      ))}
                    </div>
                  ) : null
                ) : null}
              </TableCell>
              
              {/* ...existing code... */}
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
