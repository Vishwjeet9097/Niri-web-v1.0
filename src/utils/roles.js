export const ROLES = {
  // Backend role format
  NODAL_OFFICER: "NODAL_OFFICER",
  MOSPI_REVIEWER: "MOSPI_REVIEWER",
  MOSPI_APPROVER: "MOSPI_APPROVER",
  STATE_APPROVER: "STATE_APPROVER",
  ADMIN: "ADMIN",
};

// Role display names mapping
export const ROLE_DISPLAY_NAMES = {
  [ROLES.NODAL_OFFICER]: "Nodal Officer",
  [ROLES.MOSPI_REVIEWER]: "MoSPI Reviewer",
  [ROLES.MOSPI_APPROVER]: "MoSPI Approver",
  [ROLES.STATE_APPROVER]: "State Approver",
  [ROLES.ADMIN]: "Admin",
};

// Function to get display name for a role
export const getRoleDisplayName = (role) => {
  return ROLE_DISPLAY_NAMES[role] || role;
};

// Legacy role mapping for backward compatibility
export const LEGACY_ROLES = {
  NODAL_OFFICER: "Nodal Officer",
  REVIEWER: "MoSPI Reviewer",
  APPROVER: "MoSPI Approver",
  STATE_APPROVER: "State Approver",
  ADMIN: "admin",
};

export const MENU_CONFIG = [
  {
    label: "Dashboard",
    path: "/dashboard",
    roles: [
      ROLES.NODAL_OFFICER,
      ROLES.MOSPI_REVIEWER,
      ROLES.MOSPI_APPROVER,
      ROLES.STATE_APPROVER,
      // ROLES.ADMIN, // Admin doesn't have dashboard access
    ],
    icon: "dashboard",
  },
  {
    label: "User Management",
    path: "/user-management",
    roles: [ROLES.ADMIN, ROLES.STATE_APPROVER, ROLES.MOSPI_APPROVER], // Second position
    icon: "users",
  },
  // {
  //   label: "Report",
  //   path: "/report",
  //   roles: [ROLES.STATE_APPROVER],
  //   icon: "ranking",
  // },
  {
    label: "Data Submission",
    path: "/submissions",
    roles: [ROLES.NODAL_OFFICER],
    // ROLES.ADMIN, // Admin doesn't need data submission
    icon: "submission",
  },
  {
    label: "Review Submission",
    path: "/data-submission/review",
    roles: [ROLES.STATE_APPROVER, ROLES.MOSPI_REVIEWER, ROLES.MOSPI_APPROVER],
    // ROLES.ADMIN, // Admin doesn't need review submission
    icon: "submission",
  },
  {
    label: "Ranking & Scoring",
    path: "/ranking",
    roles: [
      ROLES.NODAL_OFFICER,
      ROLES.MOSPI_APPROVER,
      ROLES.MOSPI_REVIEWER,
      ROLES.STATE_APPROVER,
      // ROLES.ADMIN, // Admin doesn't need ranking & scoring
    ],
    icon: "ranking",
  },
  {
    label: "Support & Help",
    path: "/support",
    roles: [
      ROLES.NODAL_OFFICER,
      ROLES.MOSPI_APPROVER,
      ROLES.MOSPI_REVIEWER,
      ROLES.STATE_APPROVER,
      ROLES.ADMIN,
    ],
    icon: "support",
  },
  {
    label: "Settings",
    path: "/settings",
    roles: [
      ROLES.NODAL_OFFICER,
      ROLES.MOSPI_APPROVER,
      ROLES.MOSPI_REVIEWER,
      ROLES.ADMIN,
      ROLES.STATE_APPROVER,
    ],
    icon: "settings",
  },
];
