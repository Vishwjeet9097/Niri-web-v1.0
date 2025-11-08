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

export const calculateStateProgressFromApi = (apiPayload: any): ProgressStats => {
  // 1) Build the valid code set from your config (e.g., ["1.1","1.2",...,"4.6"])
  const allIndicators = INDICATOR_SECTIONS.flatMap(s => s.indicators);
  const validCodes = new Set(allIndicators);
  const totalIndicators = allIndicators.length;

  // 2) Helper: normalize a section key (e.g., "section1_2" -> "1.2")
  const toCode = (rawCode?: string, sectionKey?: string): string | null => {
    // Prefer explicit code from API if present and valid-looking
    if (rawCode && /^\d+(\.\d+)*$/.test(rawCode)) return rawCode;

    if (sectionKey) {
      // e.g., "section1_2" -> "1.2"
      if (sectionKey.startsWith("section")) {
        const num = sectionKey.replace(/^section/, "").replace("_", ".");
        return /^\d+(\.\d+)*$/.test(num) ? num : null;
      }
      // already like "1.2"?
      if (/^\d+(\.\d+)*$/.test(sectionKey)) return sectionKey;
    }
    return null;
  };

  // 3) Approved statuses we accept
  const APPROVED_SET = new Set(["APPROVED", "ACCEPTED"]);

  // 4) De-dupe by indicator code across ALL submissions
  const approvedCodes = new Set<string>();

  const submissions = apiPayload?.data?.submissions ?? apiPayload?.submissions ?? [];
  for (const sub of submissions) {
    const statuses: any[] = sub?.statuses ?? [];
    for (const s of statuses) {
      const status = String(s?.status ?? "").toUpperCase();
      if (!APPROVED_SET.has(status)) continue;

      // Choose code from s.code, fallback to s.sectionKey
      const code = toCode(s?.code, s?.sectionKey);
      if (code && validCodes.has(code)) {
        approvedCodes.add(code);
      }
    }
  }

  // 5) Compute numbers
  const approved = approvedCodes.size;
  const percentage = totalIndicators > 0 ? Math.round((approved / totalIndicators) * 100) : 0;

  return { approved, total: totalIndicators, percentage };
};