export const ROLES = {
  // Backend role format
  NODAL_OFFICER: "NODAL_OFFICER",
  MOSPI_REVIEWER: "MOSPI_REVIEWER",
  MOSPI_APPROVER: "MOSPI_APPROVER",
  STATE_APPROVER: "STATE_APPROVER",
  ADMIN: "ADMIN",
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
      ROLES.ADMIN,
    ],
    icon: "dashboard",
  },
  {
    label: "User Management",
    path: "/user-management",
    roles: [ROLES.STATE_APPROVER, ROLES.ADMIN],
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
    icon: "submission",
  },
  {
    label: "Review Submission",
    path: "/data-submission/review",
    roles: [ROLES.STATE_APPROVER, ROLES.MOSPI_REVIEWER, ROLES.MOSPI_APPROVER],
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
      ROLES.ADMIN,
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
