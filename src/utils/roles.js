export const ROLES = {
  // Backend role format
  NODAL_OFFICER: "NODAL_OFFICER",
  MOSPI_REVIEWER: "MOSPI_REVIEWER",
  MOSPI_APPROVER: "MOSPI_APPROVER",
  STATE_APPROVER: "STATE_APPROVER",
  MINISTRY_APPROVER: "MINISTRY_APPROVER",
  ADMIN: "ADMIN",
};

// Import authService to access current user
import { authService } from "@/services/auth.service";

// Utility to get current user
export function getCurrentUser() {
  return authService.getUser();
}

// Utility to check if user has stateUt
export function userHasStateUt() {
  const user = getCurrentUser();
  return !!(user && user.stateUt);
}

// Utility to check if user has ministryId
export function userHasMinistryId() {
  const user = getCurrentUser();
  return !!(user && user.ministryId);
}

// Role display names mapping
export const ROLE_DISPLAY_NAMES = {
  [ROLES.NODAL_OFFICER]: "Nodal Officer",
  [ROLES.MOSPI_REVIEWER]: "MoSPI Reviewer",
  [ROLES.MOSPI_APPROVER]: "MoSPI Approver",
  [ROLES.STATE_APPROVER]: "State Approver",
  [ROLES.MINISTRY_APPROVER]: "Ministry Approver",
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
  MINISTRY_APPROVER: "Ministry Approver",
  ADMIN: "admin",
};


// Dynamic menu config based on user stateUt and ministryId
export const getMenuConfig = function getMenuConfig() {
  const menu = [
    {
      label: "Dashboard",
      path: ["/dashboard", "/ministry/dashboard", "/ministry/nodal"],
      roles: [
        ROLES.NODAL_OFFICER,
        ROLES.MOSPI_REVIEWER,
        ROLES.MOSPI_APPROVER,
        ROLES.STATE_APPROVER,
        ROLES.MINISTRY_APPROVER,
        ROLES.ADMIN, // Admin doesn't have dashboard access
      ],
      icon: "dashboard",
    },
    {
      label: "User Management",
      path: "/user-management",
      roles: [ROLES.ADMIN, ROLES.STATE_APPROVER, ROLES.MOSPI_APPROVER,ROLES.MINISTRY_APPROVER], // Second position
      icon: "users",
    },
    // {
    //   label: "Report",
    //   path: "/report",
    //   roles: [ROLES.STATE_APPROVER],
    //   icon: "ranking",
    // },
  ];

  // Data Submission menu logic
  if (userHasStateUt() && !userHasMinistryId()) {
    menu.push({
      label: "Data Submission",
      path: ["/submissions", "/data-submission/review"],
      roles: [ROLES.NODAL_OFFICER],
      icon: "submission",
    });
  } else if (userHasMinistryId() && !userHasStateUt()) {
    menu.push({
      label: "Data Submission",
      path: "/ministry/ministry-nodal-submission",
      roles: [ROLES.NODAL_OFFICER],
      icon: "submission",
    });
  }

  // ...existing code for other menu items...
  menu.push(
    {
      label: "Data Submission",       // dropdown label for State Approver
      roles: [ROLES.STATE_APPROVER],  // only visible to State Approver
      icon: "submission",
      children: [
        {
          label: "Create Submission",
          path: "/submissions",
        },
        {
          label: "Review Submission",
          path: "/data-submission/review",
        },
      ],
    },
    {
      label: "Data Submission",       // dropdown label for Ministry Approver
      roles: [ROLES.MINISTRY_APPROVER],  // only visible to Ministry Approver
      icon: "submission",
      children: [
        {
          label: "Create Submission",
          path: "/ministry-submission",
        },
        {
          label: "Review Submission",
          path: "/data-submission/review",
        },
      ],
    },
    {
      label: "Review Submission",
      path: "/data-submission/review",
      roles: [ROLES.MOSPI_REVIEWER, ROLES.MOSPI_APPROVER],
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
        ROLES.MINISTRY_APPROVER,
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
        ROLES.MINISTRY_APPROVER,
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
        ROLES.MINISTRY_APPROVER,
      ],
      icon: "settings",
    }
  );

  return menu;
};
