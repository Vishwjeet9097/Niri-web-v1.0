// All imports at the top
import React, { useEffect, useState } from "react";
import { Users, Search, Filter, UserCheck, UserCog, User, UserCircle, Shield, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiService } from "@/services/api.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRoleDisplayName } from "@/utils/roles";

const statusColor = {
  Active: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Inactive: "bg-gray-100 text-gray-700",
};

function AdminDashboardPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortField, setSortField] = useState("firstName");
  const [sortDirection, setSortDirection] = useState("asc");

  // Add state for role-wise users at the top level
  const [roleUsers, setRoleUsers] = useState<Record<string, any[]>>({});

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        // Fetch all active users by role from the new API
        const response = await apiService.get('users/all/active-by-role');
        // Expecting response.data to be an object with role keys
        if (response && response.data && typeof response.data === 'object') {
          // Flatten all users for the table
          const allUsers = Object.values(response.data).flat();
          setUsers(allUsers);
          // Store role-wise users for stats
          setRoleUsers(response.data);
        } else {
          setUsers([]);
          setRoleUsers({});
        }
      } catch (e) {
        setUsers([]);
        setRoleUsers({});
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  // Count users by role
  const totalUsers = users.length;
  const stateApprovers = Array.isArray(roleUsers.STATE_APPROVER) ? roleUsers.STATE_APPROVER.length : 0;
  const nodalOfficers = Array.isArray(roleUsers.NODAL_OFFICER) ? roleUsers.NODAL_OFFICER.length : 0;
  const mospiReviewers = Array.isArray(roleUsers.MOSPI_REVIEWER) ? roleUsers.MOSPI_REVIEWER.length : 0;
  const mospiApprovers = Array.isArray(roleUsers.MOSPI_APPROVER) ? roleUsers.MOSPI_APPROVER.length : 0;
  const ministryApprovers = Array.isArray(roleUsers.MINISTRY_APPROVER) ? roleUsers.MINISTRY_APPROVER.length : 0;
  const administrators = Array.isArray(roleUsers.ADMIN) ? roleUsers.ADMIN.length : 0;

  const dynamicStats = [
    { label: "Total Users", value: totalUsers, change: 0 },
    { label: getRoleDisplayName("STATE_APPROVER"), value: stateApprovers, change: 0 },
    { label: getRoleDisplayName("NODAL_OFFICER"), value: nodalOfficers, change: 0 },
    { label: getRoleDisplayName("MOSPI_REVIEWER"), value: mospiReviewers, change: 0 },
    { label: getRoleDisplayName("MOSPI_APPROVER"), value: mospiApprovers, change: 0 },
    { label: getRoleDisplayName("MINISTRY_APPROVER"), value: ministryApprovers, change: 0 },
    { label: getRoleDisplayName("ADMIN"), value: administrators, change: 0 },
  ];

  // Filtering, sorting, and pagination logic
  const filteredUsers = users
    .filter((user) => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        (user.firstName && user.firstName.toLowerCase().includes(lowerSearch)) ||
        (user.lastName && user.lastName.toLowerCase().includes(lowerSearch)) ||
        (user.email && user.email.toLowerCase().includes(lowerSearch)) ||
        (user.stateUt && user.stateUt.toLowerCase().includes(lowerSearch)) ||
        (user.state && user.state.toLowerCase().includes(lowerSearch));
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      let aValue = "";
      let bValue = "";
      switch (sortField) {
        case "firstName":
          aValue = `${a.firstName || ""} ${a.lastName || ""}`.toLowerCase();
          bValue = `${b.firstName || ""} ${b.lastName || ""}`.toLowerCase();
          break;
        case "role":
          aValue = a.role?.toLowerCase() || "";
          bValue = b.role?.toLowerCase() || "";
          break;
        case "state":
          aValue = a.stateUt?.toLowerCase() || "";
          bValue = b.stateUt?.toLowerCase() || "";
          break;
        case "email":
          aValue = a.email?.toLowerCase() || "";
          bValue = b.email?.toLowerCase() || "";
          break;
        default:
          aValue = a.firstName?.toLowerCase() || "";
          bValue = b.firstName?.toLowerCase() || "";
      }
      if (sortDirection === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Table sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary mb-1">NIE-I Platform Administration</h1>
        <p className="text-gray-600">Comprehensive system oversight and management dashboard</p>
      </div>

      {/* Overview Cards */}
      <h2 className="text-xl font-semibold text-primary mb-3">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {dynamicStats.map((stat) => {
          const iconMap: Record<string, LucideIcon> = {
            "Total Users": Users,
            [getRoleDisplayName("STATE_APPROVER")]: UserCheck,
            [getRoleDisplayName("NODAL_OFFICER")]: UserCog,
            [getRoleDisplayName("MOSPI_REVIEWER")]: User,
            [getRoleDisplayName("MOSPI_APPROVER")]: UserCircle,
            [getRoleDisplayName("MINISTRY_APPROVER")]: UserCircle,
            [getRoleDisplayName("ADMIN")]: Shield,
          };
          const colorMap: Record<string, string> = {
            "Total Users": "text-blue-500",
            [getRoleDisplayName("STATE_APPROVER")]: "text-green-500",
            [getRoleDisplayName("NODAL_OFFICER")]: "text-yellow-500",
            [getRoleDisplayName("MOSPI_REVIEWER")]: "text-purple-500",
            [getRoleDisplayName("MOSPI_APPROVER")]: "text-pink-500",
            [getRoleDisplayName("MINISTRY_APPROVER")]: "text-indigo-500",
            [getRoleDisplayName("ADMIN")]: "text-red-500",
          };
          const Icon = iconMap[stat.label] || Users;
          const iconColor = colorMap[stat.label] || "text-blue-500";
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow-sm p-4 flex flex-col items-start border">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-5 w-5 ${iconColor}`} />
                <span className="font-medium text-gray-700 text-sm">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</div>
              {/* <div className="text-xs text-green-600 mt-1">↑ +{stat.change}</div> */}
            </div>
          );
        })}
      </div>

      {/* Users Table Section */}
     <h2 className="text-xl font-semibold text-primary mb-3">Users List</h2>
      <div className="bg-white rounded-lg border border-[#ddd] p-6 mb-6 space-y-6">
        <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
          <div className="flex gap-4 items-center w-full md:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-6 h-4" />
              <Input
                placeholder="Search by name, email or state name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 w-80"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Select Roles</SelectItem>
                   <SelectItem value="NODAL_OFFICER">{getRoleDisplayName("NODAL_OFFICER")}</SelectItem>
                   <SelectItem value="STATE_APPROVER">{getRoleDisplayName("STATE_APPROVER")}</SelectItem>
                  <SelectItem value="MOSPI_REVIEWER">{getRoleDisplayName("MOSPI_REVIEWER")}</SelectItem>
                  <SelectItem value="MOSPI_APPROVER">{getRoleDisplayName("MOSPI_APPROVER")}</SelectItem>
                  <SelectItem value="MINISTRY_APPROVER">{getRoleDisplayName("MINISTRY_APPROVER")}</SelectItem>
                  <SelectItem value="ADMIN">{getRoleDisplayName("ADMIN")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(searchTerm || roleFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setRoleFilter("all");
                  setCurrentPage(1);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
        {/* Results Count */}
        <div className="text-sm text-muted-foreground mb-2">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
          {filteredUsers.length !== users.length && (
            <span className="ml-2 text-primary">
              (filtered from {users.length} total)
            </span>
          )}
        </div>
        <UserTableNoActions
          users={paginatedUsers}
          loading={loading}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {/* Page {currentPage} of {totalPages} */}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
// UserTableNoActions component for displaying the users table without actions
function UserTableNoActions({ users, loading, sortField, sortDirection, onSort }) {
  if (loading) {
    return <div className="py-8 text-center text-gray-500">Loading users...</div>;
  }
  if (!users || users.length === 0) {
    return <div className="py-8 text-center text-gray-500">No users found.</div>;
  }
  // Sortable header
  const SortableHeader = ({ field, children }) => (
    <th
      className="px-3 py-2 text-left font-semibold text-gray-700 cursor-pointer select-none"
      onClick={() => onSort && onSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === "asc" ? <span>▲</span> : <span>▼</span>
        )}
      </span>
    </th>
  );
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 text-left font-semibold text-gray-700">S.no.</th>
            <SortableHeader field="firstName">Officer Name</SortableHeader>
            <SortableHeader field="role">Role</SortableHeader>
            <SortableHeader field="state">State/UT</SortableHeader>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">Contact Number</th>
            <SortableHeader field="email">Email</SortableHeader>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
           </tr>
        </thead>
        <tbody>
          {users.map((user, idx) => (
            <tr key={user.email || user.id} className="border-b last:border-0">
              <td className="px-3 py-2">{idx + 1}</td>
              <td className="px-3 py-2 flex items-center gap-3">                
                <div>
                  <div className="font-medium text-gray-900">{`${user.firstName || ""} ${user.lastName || ""}`}</div>
                 </div>
              </td>
              <td className="px-3 py-2">
                <Badge variant="secondary">{getRoleDisplayName(user.role)}</Badge>
              </td>
              <td className="px-3 py-2">{user.stateUt || user.state || "-"}</td>
              <td className="px-3 py-2">+91 {user.contactNumber || "-"}</td>
              <td className="px-3 py-2">{user.email}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor[user.status] || "bg-gray-100 text-gray-700"}`}>{user.status ? user.status : (user.isActive ? "Active" : "Inactive")}</span>
              </td>
             </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
}

export default AdminDashboardPage;