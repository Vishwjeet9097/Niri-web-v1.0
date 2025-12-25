import {
  INDICATOR_SECTIONS,
  ALL_INDICATOR_CODES,
} from "@/hooks/useIndicatorAccess";
export interface ProgressStats {
  approved: number;
  total: number;
  percentage: number;
}

// export const calculateStateProgressFromApi = (apiPayload: any): ProgressStats => {
//   const allIndicators = INDICATOR_SECTIONS.flatMap(s => s.indicators);
//   const totalIndicators = allIndicators.length;
//   const valid = new Set(allIndicators);

// //   const approved = new Set<string>();

//   const toCode = (sectionKey?: string): string | null => {
//     if (!sectionKey) return null;
//     // "section1_2" -> "1.2"
//     if (sectionKey.startsWith("section")) {
//       const num = sectionKey.replace(/^section/, "");
//       return num.replace("_", ".");
//     }
//     // already "1.2"?
//     if (/^\d+(\.\d+)*$/.test(sectionKey)) return sectionKey;
//     return null;
//   };

//   const submissions = apiPayload?.data?.submissions ?? apiPayload?.submissions ?? [];

//   const APPROVED_SET = new Set([
//     "APPROVED",
//     "ACCEPTED",

//   ]);

//   const approvedPaths = new Set<string>();

// //   for (const sub of submissions) {
// //     const statuses: any[] = sub?.statuses || [];
// //     for (const s of statuses) {
// //       const status = s?.status?.toUpperCase?.();
// //       if (status !== "APPROVED" && status !== "ACCEPTED") continue;

// //       const code = toCode(s?.sectionKey);
// //       if (code && valid.has(code)) approved.add(code);
// //     }
// //   }

//   for (const s of submissions) {
//     for (const st of (s?.statuses ?? [])) {
//       const status = String(st?.status ?? "").toUpperCase();
//       if (APPROVED_SET.has(status)) {
//         const path = st?.path || `${st?.parentKey}.${st?.sectionKey}`;
//         if (path) approvedPaths.add(path);
//       }
//     }
//   }

// //   const approvedCount = approved.size;

// const approved = approvedPaths.size;
//   const percentage =
//     totalIndicators > 0
//       ? Math.round((approved / totalIndicators) * 100)
//       : 0;

//   return { approved: approved, total: totalIndicators, percentage };
// };

// export const calculateStateProgressFromApi = (apiPayload: any): ProgressStats => {
//   // 1) Build the valid code set from your config (e.g., ["1.1","1.2",...,"4.6"])
//   const allIndicators = INDICATOR_SECTIONS.flatMap(s => s.indicators);
//   const validCodes = new Set(allIndicators);
//   const totalIndicators = allIndicators.length;

//   // 2) Helper: normalize a section key (e.g., "section1_2" -> "1.2")
//   const toCode = (rawCode?: string, sectionKey?: string): string | null => {
//     // Prefer explicit code from API if present and valid-looking
//     if (rawCode && /^\d+(\.\d+)*$/.test(rawCode)) return rawCode;

//     if (sectionKey) {
//       // e.g., "section1_2" -> "1.2"
//       if (sectionKey.startsWith("section")) {
//         const num = sectionKey.replace(/^section/, "").replace("_", ".");
//         return /^\d+(\.\d+)*$/.test(num) ? num : null;
//       }
//       // already like "1.2"?
//       if (/^\d+(\.\d+)*$/.test(sectionKey)) return sectionKey;
//     }
//     return null;
//   };

//   // 3) Approved statuses we accept
//   const APPROVED_SET = new Set(["APPROVED", "ACCEPTED"]);

//   // 4) De-dupe by indicator code across ALL submissions
//   const approvedCodes = new Set<string>();

//   const submissions = apiPayload?.data?.submissions ?? apiPayload?.submissions ?? [];
//   for (const sub of submissions) {
//     const statuses: any[] = sub?.statuses ?? [];
//     for (const s of statuses) {
//       const status = String(s?.status ?? "").toUpperCase();
//       if (!APPROVED_SET.has(status)) continue;

//       // Choose code from s.code, fallback to s.sectionKey
//       const code = toCode(s?.code, s?.sectionKey);
//       if (code && validCodes.has(code)) {
//         approvedCodes.add(code);
//       }
//     }
//   }

//   // 5) Compute numbers
//   const approved = approvedCodes.size;
//   const percentage = totalIndicators > 0 ? Math.round((approved / totalIndicators) * 100) : 0;

//   return { approved, total: totalIndicators, percentage };
// };

// export const calculateStateProgressFromApi = (resp: any): ProgressStats => {
//   const s = resp?.data?.summary;
//   if (s && typeof s.acceptedCount === "number" && typeof s.totalIndicators === "number") {
//     return {
//       approved: s.acceptedCount,
//       total: s.totalIndicators,
//       percentage:
//         typeof s.percentage === "number"
//           ? Math.round(s.percentage)
//           : s.totalIndicators
//             ? Math.round((s.acceptedCount / s.totalIndicators) * 100)
//             : 0,
//     };
//   }

//   // Fallback (if summary missing)
//   const APPROVED = new Set(["APPROVED", "ACCEPTED"]);
//   const sections = resp?.data?.sections ?? [];
//   const fromLatest = new Set<string>();

//   const toCode = (sectionKey?: string) => {
//     if (!sectionKey) return null;
//     if (sectionKey.startsWith("section")) {
//       const num = sectionKey.replace(/^section/, "").replace("_", ".");
//       return /^\d+(\.\d+)*$/.test(num) ? num : null;
//     }
//     return /^\d+(\.\d+)*$/.test(sectionKey) ? sectionKey : null;
//   };

//   for (const row of sections) {
//     const st = row?.latestStatus?.data?.status;
//     if (!APPROVED.has(String(st ?? "").toUpperCase())) continue;
//     const code = toCode(row?.latestStatus?.sectionKey);
//     if (code) fromLatest.add(code);
//   }

//   const total = Number(resp?.data?.summary?.totalIndicators) || 20;
//   const approved = fromLatest.size;
//   const percentage = total ? Math.round((approved / total) * 100) : 0;
//   return { approved, total, percentage };
// };

// progressUtils.ts

/**
 * Calculate progress from raw submissions array (fallback when API doesn't return proper data)
 */
export const calculateStateProgressFromSubmissions = (
  submissions: any[],
  userStateUt?: string
): ProgressStats => {
  const APPROVED = new Set(["APPROVED", "ACCEPTED"]);

  // Filter submissions relevant to STATE_APPROVER
  const relevantSubmissions = submissions.filter((sub) => {
    // Include DRAFT, SUBMITTED_TO_STATE, RETURNED_FROM_MOSPI, and SUBMITTED_TO_MOSPI_REVIEWER submissions from the same state
    // RETURNED_FROM_MOSPI is included because STATE_APPROVER should calculate progress from the corrected form
    // SUBMITTED_TO_MOSPI_REVIEWER is included because STATE_APPROVER should still see progress
    // for indicators they accepted even after submitting to MOSPI_REVIEWER
    const statusMatch =
      sub.status === "DRAFT" ||
      sub.status === "SUBMITTED_TO_STATE" ||
      sub.status === "RETURNED_FROM_MOSPI" ||
      sub.status === "SUBMITTED_TO_MOSPI_REVIEWER";
    const stateMatch =
      !userStateUt ||
      sub.stateUt?.toUpperCase() === userStateUt.toUpperCase() ||
      sub.user?.stateUt?.toUpperCase() === userStateUt.toUpperCase();
    return statusMatch && stateMatch;
  });

  console.log("🧮[calc] Calculating from submissions array:", {
    totalSubmissions: submissions.length,
    relevantSubmissions: relevantSubmissions.length,
    userStateUt,
  });

  const toCodeFromSectionKey = (sectionKey?: string): string | null => {
    if (!sectionKey) return null;
    if (sectionKey.startsWith("section")) {
      const num = sectionKey.replace(/^section/, "").replace("_", ".");
      return /^\d+(\.\d+)*$/.test(num) ? num : null;
    }
    return /^\d+(\.\d+)*$/.test(sectionKey) ? sectionKey : null;
  };

  const acceptedCodes = new Set<string>();
  const indicatorStatusMap = new Map<
    string,
    { status: string; fromReturnedForm: boolean }
  >();

  // STEP 1: First, extract all indicators from RETURNED_FROM_MOSPI form (highest priority)
  const returnedFromMospiSubmissions = relevantSubmissions.filter(
    (sub) => sub.status === "RETURNED_FROM_MOSPI"
  );

  for (const sub of returnedFromMospiSubmissions) {
    const formData = sub.formData || sub.form_data || {};

    Object.entries(formData).forEach(
      ([parentKey, parentData]: [string, any]) => {
        if (typeof parentData !== "object" || parentData === null) return;

        Object.entries(parentData).forEach(
          ([sectionKey, sectionData]: [string, any]) => {
            if (typeof sectionData !== "object" || sectionData === null) return;

            const status = String(sectionData?.status ?? "").toUpperCase();
            const mospiStatus = String(
              sectionData?.mospi_status ?? ""
            ).toUpperCase();
            const code = toCodeFromSectionKey(sectionKey);

            // Debug logging for indicators 2.3, 2.4, 2.5
            if (code && ["2.3", "2.4", "2.5"].includes(code)) {
              console.log(`🔍[calc] DEBUG ${code} from RETURNED_FROM_MOSPI:`, {
                sectionKey,
                parentKey,
                rawStatus: sectionData?.status,
                rawMospiStatus: sectionData?.mospi_status,
                normalizedStatus: status,
                normalizedMospiStatus: mospiStatus,
                sectionDataKeys: Object.keys(sectionData || {}),
              });
            }

            if (code) {
              // Store both status and mospi_status from RETURNED_FROM_MOSPI form with priority flag
              // If mospi_status is ACCEPTED, treat it as ACCEPTED even if status is SUBMITTED_TO_STATE
              const effectiveStatus = APPROVED.has(mospiStatus)
                ? mospiStatus
                : status;

              // Always add RETURNED_FROM_MOSPI form indicators to map (they have highest priority)
              // Even if status is empty, we mark it so we know it came from RETURNED_FROM_MOSPI
              // This preserves the priority: RETURNED_FROM_MOSPI > other forms
              indicatorStatusMap.set(code, {
                status: effectiveStatus || "", // Store empty string if no status
                fromReturnedForm: true,
              });
              console.log(
                `🔵[calc] RETURNED_FROM_MOSPI form: indicator ${code} has status ${status}, mospi_status ${mospiStatus} → effective: ${
                  effectiveStatus || "(empty)"
                } in ${parentKey}.${sectionKey}`
              );
            }
          }
        );
      }
    );
  }

  // STEP 2: Then, extract indicators from other forms (DRAFT, SUBMITTED_TO_STATE, SUBMITTED_TO_MOSPI_REVIEWER)
  // Only add if not already present in RETURNED_FROM_MOSPI form
  const otherSubmissions = relevantSubmissions.filter(
    (sub) => sub.status !== "RETURNED_FROM_MOSPI"
  );

  for (const sub of otherSubmissions) {
    const formData = sub.formData || sub.form_data || {};

    Object.entries(formData).forEach(
      ([parentKey, parentData]: [string, any]) => {
        if (typeof parentData !== "object" || parentData === null) return;

        Object.entries(parentData).forEach(
          ([sectionKey, sectionData]: [string, any]) => {
            if (typeof sectionData !== "object" || sectionData === null) return;

            const status = String(sectionData?.status ?? "").toUpperCase();
            const mospiStatus = String(
              sectionData?.mospi_status ?? ""
            ).toUpperCase();
            const code = toCodeFromSectionKey(sectionKey);

            // Debug logging for indicators 2.3, 2.4, 2.5
            if (code && ["2.3", "2.4", "2.5"].includes(code)) {
              console.log(`🔍[calc] DEBUG ${code} from ${sub.status}:`, {
                sectionKey,
                parentKey,
                rawStatus: sectionData?.status,
                rawMospiStatus: sectionData?.mospi_status,
                normalizedStatus: status,
                normalizedMospiStatus: mospiStatus,
                sectionDataKeys: Object.keys(sectionData || {}),
              });
            }

            if (code) {
              const existingEntry = indicatorStatusMap.get(code);
              const effectiveStatus = APPROVED.has(mospiStatus)
                ? mospiStatus
                : status;

              // RETURNED_FROM_MOSPI form has highest priority
              // Only override if:
              // 1. Not in map yet (no RETURNED_FROM_MOSPI form has this indicator)
              // 2. OR existing entry is from RETURNED_FROM_MOSPI but has empty status AND we have a valid status
              //    (This allows filling in missing statuses from RETURNED_FROM_MOSPI forms)
              const isFromReturnedForm =
                existingEntry?.fromReturnedForm === true;
              const existingStatusEmpty =
                !existingEntry?.status || existingEntry.status.trim() === "";
              const hasValidStatus =
                effectiveStatus && effectiveStatus.trim() !== "";

              const shouldAdd =
                !existingEntry || // Not in map yet
                (isFromReturnedForm && existingStatusEmpty && hasValidStatus); // RETURNED_FROM_MOSPI has empty status, we have valid status

              if (shouldAdd && hasValidStatus) {
                // If existing entry is from RETURNED_FROM_MOSPI, preserve that flag
                indicatorStatusMap.set(code, {
                  status: effectiveStatus,
                  fromReturnedForm: isFromReturnedForm || false, // Preserve RETURNED_FROM_MOSPI flag if it exists
                });
                console.log(
                  `🟢[calc] Other form (${
                    sub.status
                  }): indicator ${code} has status ${status}, mospi_status ${mospiStatus} → effective: ${effectiveStatus} in ${parentKey}.${sectionKey}${
                    isFromReturnedForm
                      ? " (filling empty RETURNED_FROM_MOSPI status)"
                      : ""
                  }`
                );
              } else if (existingEntry) {
                if (isFromReturnedForm && !existingStatusEmpty) {
                  console.log(
                    `⏭️[calc] Skipping indicator ${code} from ${sub.status} - RETURNED_FROM_MOSPI form has priority with status: ${existingEntry.status}`
                  );
                } else {
                  console.log(
                    `⏭️[calc] Skipping indicator ${code} from ${
                      sub.status
                    } - already exists in map with status: ${
                      existingEntry.status || "(empty)"
                    }`
                  );
                }
              } else {
                console.log(
                  `⚠️[calc] Skipping indicator ${code} from ${sub.status} - empty status`
                );
              }
            }
          }
        );
      }
    );
  }

  // STEP 3: Build acceptedCodes set from indicatorStatusMap, only including ACCEPTED indicators
  indicatorStatusMap.forEach((indicatorInfo, code) => {
    if (APPROVED.has(indicatorInfo.status)) {
      acceptedCodes.add(code);
      console.log(
        `✅[calc] Accepted indicator ${code} (from ${
          indicatorInfo.fromReturnedForm ? "RETURNED_FROM_MOSPI" : "other"
        } form)`
      );
    }
  });

  const total = ALL_INDICATOR_CODES.length; // Default total indicators (19)
  const approved = acceptedCodes.size;
  const percentage = total ? Math.round((approved / total) * 100) : 0;

  const out = { approved, total, percentage };
  console.log(
    "✅[calc] Calculated from submissions ->",
    out,
    "acceptedCodes:",
    Array.from(acceptedCodes)
  );
  return out;
};

export const calculateStateProgressFromApi = (
  resp: any,
  fallbackSubmissions?: any[],
  userStateUt?: string
): ProgressStats => {
  // 🔧 Normalize shape: accept either payload or envelope
  const payload = resp && resp.data !== undefined ? resp.data : resp;

  console.log("🧮[calc] raw resp:", resp);
  console.log("🧮[calc] normalized payload:", payload);

  const s = payload?.summary;
  console.log("🧮[calc] payload.summary:", s);

  // ✅ Prefer backend-computed summary when available
  const acceptedFromSummary =
    typeof s?.acceptedCount === "number" ? s.acceptedCount : null;
  const totalFromSummary =
    typeof s?.totalIndicators === "number" ? s.totalIndicators : null;

  // Check if backend returned valid data (non-zero submissions or non-zero accepted count)
  const hasValidBackendData =
    acceptedFromSummary !== null &&
    totalFromSummary !== null &&
    (payload?.submissions?.length > 0 || acceptedFromSummary > 0);

  if (hasValidBackendData) {
    const pct =
      typeof s?.percentage === "number"
        ? Math.round(s.percentage)
        : totalFromSummary
        ? Math.round((acceptedFromSummary / totalFromSummary) * 100)
        : 0;

    const out = {
      approved: acceptedFromSummary,
      total: totalFromSummary,
      percentage: pct,
    };
    console.log("✅[calc] using backend summary ->", out);
    return out;
  }

  // 🔁 Fallback 1: recompute from submissions[*].statuses in API response
  const APPROVED = new Set(["APPROVED", "ACCEPTED"]);
  const submissions: any[] = Array.isArray(payload?.submissions)
    ? payload.submissions
    : [];

  console.log(
    "🧮[calc] fallback recompute, submissions.len:",
    submissions.length
  );

  const toCodeFromSectionKey = (sectionKey?: string): string | null => {
    if (!sectionKey) return null;
    if (sectionKey.startsWith("section")) {
      const num = sectionKey.replace(/^section/, "").replace("_", ".");
      return /^\d+(\.\d+)*$/.test(num) ? num : null;
    }
    return /^\d+(\.\d+)*$/.test(sectionKey) ? sectionKey : null;
  };

  const toCodeFromPath = (path?: string): string | null => {
    if (!path) return null;
    const m = path.match(/section(\d+)_(\d+)/i);
    return m ? `${m[1]}.${m[2]}` : null;
  };

  const acceptedCodes = new Set<string>();
  const indicatorStatusMap = new Map<
    string,
    { status: string; fromReturnedForm: boolean }
  >();

  // STEP 1: First, extract all indicators from RETURNED_FROM_MOSPI submissions (highest priority)
  const returnedFromMospiSubmissions = submissions.filter(
    (sub) => sub.status === "RETURNED_FROM_MOSPI"
  );

  for (const sub of returnedFromMospiSubmissions) {
    // Try to use formData first (more accurate, includes mospi_status)
    const formData = sub.formData || sub.form_data || {};
    const hasFormData = Object.keys(formData).length > 0;

    if (hasFormData) {
      // Use formData structure (same as calculateStateProgressFromSubmissions)
      Object.entries(formData).forEach(
        ([parentKey, parentData]: [string, any]) => {
          if (typeof parentData !== "object" || parentData === null) return;

          Object.entries(parentData).forEach(
            ([sectionKey, sectionData]: [string, any]) => {
              if (typeof sectionData !== "object" || sectionData === null)
                return;

              const status = String(sectionData?.status ?? "").toUpperCase();
              const mospiStatus = String(
                sectionData?.mospi_status ?? ""
              ).toUpperCase();
              const code = toCodeFromSectionKey(sectionKey);

              if (code) {
                // If mospi_status is ACCEPTED, treat it as ACCEPTED even if status is SUBMITTED_TO_STATE
                const effectiveStatus = APPROVED.has(mospiStatus)
                  ? mospiStatus
                  : status;

                indicatorStatusMap.set(code, {
                  status: effectiveStatus,
                  fromReturnedForm: true,
                });
                console.log(
                  `🔵[calc] RETURNED_FROM_MOSPI form (formData): indicator ${code} has status ${status}, mospi_status ${mospiStatus} → effective: ${effectiveStatus}`
                );
              }
            }
          );
        }
      );
    } else {
      // Fallback to statuses array if formData not available
      const rows: any[] = Array.isArray(sub?.statuses) ? sub.statuses : [];
      for (const row of rows) {
        const st = String(row?.status ?? "").toUpperCase();
        const mospiSt = String(row?.mospi_status ?? "").toUpperCase();

        // try different ways to derive the canonical code
        const code =
          (typeof row?.code === "string" && /^\d+(\.\d+)*$/.test(row.code)
            ? row.code
            : null) ||
          toCodeFromSectionKey(row?.sectionKey) ||
          toCodeFromPath(row?.path);

        if (code) {
          // If mospi_status is ACCEPTED, treat it as ACCEPTED even if status is SUBMITTED_TO_STATE
          const effectiveStatus = APPROVED.has(mospiSt) ? mospiSt : st;

          indicatorStatusMap.set(code, {
            status: effectiveStatus,
            fromReturnedForm: true,
          });
          console.log(
            `🔵[calc] RETURNED_FROM_MOSPI form (statuses array): indicator ${code} has status ${st}, mospi_status ${mospiSt} → effective: ${effectiveStatus}`
          );
        }
      }
    }
  }

  // STEP 2: Then, extract indicators from other submissions
  // Only add if not already present in RETURNED_FROM_MOSPI form
  const otherSubmissions = submissions.filter(
    (sub) => sub.status !== "RETURNED_FROM_MOSPI"
  );

  for (const sub of otherSubmissions) {
    // Try to use formData first (more accurate, includes mospi_status)
    const formData = sub.formData || sub.form_data || {};
    const hasFormData = Object.keys(formData).length > 0;

    if (hasFormData) {
      // Use formData structure (same as calculateStateProgressFromSubmissions)
      Object.entries(formData).forEach(
        ([parentKey, parentData]: [string, any]) => {
          if (typeof parentData !== "object" || parentData === null) return;

          Object.entries(parentData).forEach(
            ([sectionKey, sectionData]: [string, any]) => {
              if (typeof sectionData !== "object" || sectionData === null)
                return;

              const status = String(sectionData?.status ?? "").toUpperCase();
              const mospiStatus = String(
                sectionData?.mospi_status ?? ""
              ).toUpperCase();
              const code = toCodeFromSectionKey(sectionKey);

              if (code) {
                // Only add if not already in map (RETURNED_FROM_MOSPI takes priority)
                if (!indicatorStatusMap.has(code)) {
                  // If mospi_status is ACCEPTED, treat it as ACCEPTED even if status is SUBMITTED_TO_STATE
                  const effectiveStatus = APPROVED.has(mospiStatus)
                    ? mospiStatus
                    : status;

                  indicatorStatusMap.set(code, {
                    status: effectiveStatus,
                    fromReturnedForm: false,
                  });
                  console.log(
                    `🟢[calc] Other form (${sub.status}, formData): indicator ${code} has status ${status}, mospi_status ${mospiStatus} → effective: ${effectiveStatus}`
                  );
                } else {
                  console.log(
                    `⏭️[calc] Skipping indicator ${code} from ${sub.status} - already exists in RETURNED_FROM_MOSPI form`
                  );
                }
              }
            }
          );
        }
      );
    } else {
      // Fallback to statuses array if formData not available
      const rows: any[] = Array.isArray(sub?.statuses) ? sub.statuses : [];
      for (const row of rows) {
        const st = String(row?.status ?? "").toUpperCase();
        const mospiSt = String(row?.mospi_status ?? "").toUpperCase();

        // try different ways to derive the canonical code
        const code =
          (typeof row?.code === "string" && /^\d+(\.\d+)*$/.test(row.code)
            ? row.code
            : null) ||
          toCodeFromSectionKey(row?.sectionKey) ||
          toCodeFromPath(row?.path);

        if (code) {
          // Only add if not already in map (RETURNED_FROM_MOSPI takes priority)
          if (!indicatorStatusMap.has(code)) {
            // If mospi_status is ACCEPTED, treat it as ACCEPTED even if status is SUBMITTED_TO_STATE
            const effectiveStatus = APPROVED.has(mospiSt) ? mospiSt : st;

            indicatorStatusMap.set(code, {
              status: effectiveStatus,
              fromReturnedForm: false,
            });
            console.log(
              `🟢[calc] Other form (${sub.status}, statuses array): indicator ${code} has status ${st}, mospi_status ${mospiSt} → effective: ${effectiveStatus}`
            );
          } else {
            console.log(
              `⏭️[calc] Skipping indicator ${code} from ${sub.status} - already exists in RETURNED_FROM_MOSPI form`
            );
          }
        }
      }
    }
  }

  // STEP 3: Build acceptedCodes set from indicatorStatusMap, only including ACCEPTED indicators
  indicatorStatusMap.forEach((indicatorInfo, code) => {
    if (APPROVED.has(indicatorInfo.status)) {
      acceptedCodes.add(code);
      console.log(
        `✅[calc] Accepted indicator ${code} (from ${
          indicatorInfo.fromReturnedForm ? "RETURNED_FROM_MOSPI" : "other"
        } form)`
      );
    }
  });

  // 🔁 Fallback 2: If API returned empty submissions but we have fallbackSubmissions, use those
  if (
    submissions.length === 0 &&
    fallbackSubmissions &&
    fallbackSubmissions.length > 0
  ) {
    console.log(
      "⚠️[calc] API returned empty submissions, using fallback submissions array"
    );
    return calculateStateProgressFromSubmissions(
      fallbackSubmissions,
      userStateUt
    );
  }

  // If backend didn't give a total, keep your previous default (19) or make configurable
  const total =
    typeof s?.totalIndicators === "number"
      ? s.totalIndicators
      : ALL_INDICATOR_CODES.length;
  const approved = acceptedCodes.size;
  const percentage = total ? Math.round((approved / total) * 100) : 0;

  const out = { approved, total, percentage };
  console.log(
    "✅[calc] recomputed ->",
    out,
    "acceptedCodes:",
    Array.from(acceptedCodes)
  );
  return out;
};
