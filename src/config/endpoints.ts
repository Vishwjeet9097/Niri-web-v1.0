// Centralized API endpoints for NIRI web app
// Update this file as new endpoints are added/changed
import { config } from "./environment";

const BASE = config.apiBaseUrl;

export const API_ENDPOINTS = {
  auth: {
    login: `${BASE}/auth/login`,
    register: `${BASE}/auth/register`,
    profile: `${BASE}/auth/profile`,
    changePassword: `${BASE}/auth/change-password`,
  },
  submission: {
    root: `${BASE}/submission`,
    /**
     * Returns the /submission endpoint with status param based on role.
     * @param role - user role string (e.g. "state_approver", "nodal_officer", "mospi_reviewer", "mospi_approver")
     * @param page - page number (default 1)
     * @param limit - page size (default 10)
     */
    byRole: (role: string, page = 1, limit = 10) => {
      let status = "";
      switch (role.toLowerCase()) {
        case "state_approver":
          status =
            "SUBMITTED_TO_STATE,RETURNED_FROM_MOSPI,REJECTED,SUBMITTED_TO_MOSPI_REVIEWER,SUBMITTED_TO_MOSPI_APPROVER,APPROVED,RETURNED_FROM_MOSPI";
          break;
        case "nodal_officer":
          status =
            "DRAFT,REJECTED_FINAL,REJECTED,APPROVED,SUBMITTED_TO_STATE,SUBMITTED_TO_MOSPI_REVIEWER,SUBMITTED_TO_MOSPI_APPROVER,RETURNED_FROM_STATE"; // Nodal officers see their own drafts
          break;
        case "mospi_reviewer":
          status =
            "SUBMITTED_TO_MOSPI_REVIEWER,SUBMITTED_TO_MOSPI_APPROVER,REJECTED_FINAL,APPROVED,RETURNED_FROM_MOSPI";
          break;
        case "mospi_approver":
          status =
            "SUBMITTED_TO_MOSPI_APPROVER,APPROVED,REJECTED_FINAL,RETURNED_FROM_MOSPI";
          break;
        default:
          status = "";
      }
      let url = `${BASE}/submission?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      return url;
    },
    byId: (id: string) => `${BASE}/submission/${id}`,
    comment: (id: string) => `${BASE}/submission/${id}/comment`,
    forwardToMospi: (id: string) => `${BASE}/submission/forward-to-mospi/${id}`,
    forwardToMospiApprover: (id: string) =>
      `${BASE}/submission/forward-to-mospi-approver/${id}`,
    stateReject: (id: string) => `${BASE}/submission/state-reject/${id}`,
    finalReject: (id: string) => `${BASE}/submission/final-reject/${id}`,
    resubmit: (id: string) => `${BASE}/submission/resubmit/${id}`,
    approve: (id: string) => `${BASE}/submission/approve/${id}`,
    delete: (id: string) => `${BASE}/submission/${id}`,
  },
  file: {
    upload: (submissionId: string) => `${BASE}/file/upload/${submissionId}`,
    uploadMultiple: (submissionId: string) =>
      `${BASE}/file/upload-multiple/${submissionId}`,
    url: (filePath: string) => `${BASE}/file/url/${filePath}`,
    delete: (filePath: string) => `${BASE}/file/${filePath}`,
  },
  dashboard: {
    summary: `${BASE}/dashboard/summary`,
    kpis: (role?: string) =>
      role ? `${BASE}/dashboard/kpis?role=${role}` : `${BASE}/dashboard/kpis`,
  },
  users: {
    root: `${BASE}/users`,
    byState: (state: string) => `${BASE}/users/by-state/${state}`,
    byRole: (role: string, stateUt?: string) =>
      `${BASE}/users/by-role/${role}${stateUt ? `?stateUt=${stateUt}` : ""}`,
    byId: (id: string) => `${BASE}/users/${id}`,
  },
  report: {
    ranking: `${BASE}/report/ranking`,
    full: `${BASE}/report/full-report`,
    state: (state: string) => `${BASE}/report/state/${state}`,
    export: (format: string) => `${BASE}/report/export?format=${format}`,
  },
  audit: {
    root: (page = 1, limit = 10) => `${BASE}/audit?page=${page}&limit=${limit}`,
    entity: (entityType: string, entityId: string) =>
      `${BASE}/audit/entity/${entityType}/${entityId}`,
    user: (userId: string) => `${BASE}/audit/user/${userId}`,
    myActivity: `${BASE}/audit/my-activity`,
  },
};
