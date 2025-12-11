import { INDICATOR_SECTIONS } from "@/hooks/useIndicatorAccess";
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
    // Include DRAFT and SUBMITTED_TO_STATE submissions from the same state
    const statusMatch =
      sub.status === "DRAFT" || sub.status === "SUBMITTED_TO_STATE";
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

  // Extract accepted indicators from formData
  for (const sub of relevantSubmissions) {
    const formData = sub.formData || sub.form_data || {};

    // Iterate through categories (infraFinancing, infraDevelopment, etc.)
    Object.entries(formData).forEach(
      ([parentKey, parentData]: [string, any]) => {
        if (typeof parentData !== "object" || parentData === null) return;

        // Iterate through sections (section1_1, section1_2, etc.)
        Object.entries(parentData).forEach(
          ([sectionKey, sectionData]: [string, any]) => {
            if (typeof sectionData !== "object" || sectionData === null) return;

            // Check if this section has ACCEPTED status
            const status = String(sectionData?.status ?? "").toUpperCase();
            if (!APPROVED.has(status)) return;

            // Extract indicator code from sectionKey (e.g., "section1_1" -> "1.1")
            const code = toCodeFromSectionKey(sectionKey);
            if (code) {
              acceptedCodes.add(code);
              console.log(
                `✅[calc] Found accepted indicator ${code} in ${parentKey}.${sectionKey}`
              );
            }
          }
        );
      }
    );
  }

  const total = 20; // Default total indicators
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

  for (const sub of submissions) {
    const rows: any[] = Array.isArray(sub?.statuses) ? sub.statuses : [];
    for (const row of rows) {
      const st = String(row?.status ?? "").toUpperCase();
      if (!APPROVED.has(st)) continue;

      // try different ways to derive the canonical code
      const code =
        (typeof row?.code === "string" && /^\d+(\.\d+)*$/.test(row.code)
          ? row.code
          : null) ||
        toCodeFromSectionKey(row?.sectionKey) ||
        toCodeFromPath(row?.path);

      if (code) acceptedCodes.add(code);
    }
  }

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

  // If backend didn't give a total, keep your previous default (20) or make configurable
  const total = typeof s?.totalIndicators === "number" ? s.totalIndicators : 20;
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
