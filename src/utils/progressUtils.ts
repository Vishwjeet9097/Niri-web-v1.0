import { INDICATOR_SECTIONS } from "@/hooks/useIndicatorAccess";
export interface ProgressStats {
  approved: number;
  total: number;
  percentage: number;
}

// export const calculateIndicatorProgress = (formData: any): ProgressStats => {
  
//    const allIndicators = INDICATOR_SECTIONS.flatMap(s => s.indicators);
//   const totalIndicators = allIndicators.length;

//     // let totalIndicators = 0;
//   let approvedIndicators = 0;

//   // Iterate through each category in the form data
// //   Object.keys(formData).forEach(category => {
// //     if (typeof formData[category] === 'object' && formData[category] !== null) {
// //       Object.keys(formData[category]).forEach(indicatorId => {
// //         const indicator = formData[category][indicatorId];
// //         totalIndicators++;
        
// //         // Check if the indicator is approved or accepted
// //         if (indicator.status && 
// //             (indicator.status.toUpperCase() === 'APPROVED' || 
// //              indicator.status.toUpperCase() === 'ACCEPTED')) {
// //           approvedIndicators++;
// //         }
// //       });
// //     }
// //   });

// //     allIndicators.forEach(indicatorCode => {
// //     // Find indicator in formData
// //     for (const category of Object.values(formData || {})) {
// //       const indicator = category[indicatorCode];
// //       if (
// //         indicator &&
// //         indicator.status &&
// //         (indicator.status.toUpperCase() === "APPROVED" ||
// //          indicator.status.toUpperCase() === "ACCEPTED")
// //       ) {
// //         approvedIndicators++;
// //         break;
// //       }
// //     }
// //   });

//  const approvedSet = new Set<string>();
//   Object.values(formData || {}).forEach((category: any) => {
//     if (!category || typeof category !== "object") return;
//     Object.entries(category).forEach(([key, indicator]: any) => {
//       const status = indicator?.status?.toUpperCase?.();
//       // Expect keys like "1.1", "1.2" in your form structure; if they look like "section1_2", normalize below if needed
//       const code = key.startsWith("section")
//         ? key.replace(/^section/, "").replace("_", ".") // section1_2 -> 1.2
//         : key;

//             if (
//         status &&
//         (status === "APPROVED" || status === "ACCEPTED") &&
//         allIndicators.includes(code)
//       ) {
//         approvedSet.add(code);
//       }
//     });
//   });

//   approvedIndicators = approvedSet.size;


//   const percentage = totalIndicators > 0 
//     ? Math.round((approvedIndicators / totalIndicators) * 100) 
//     : 0;

//   return {
//     approved: approvedIndicators,
//     total: totalIndicators,
//     percentage
//   };
// };

export const calculateStateProgressFromApi = (apiPayload: any): ProgressStats => {
  const allIndicators = INDICATOR_SECTIONS.flatMap(s => s.indicators);
  const totalIndicators = allIndicators.length;
  const valid = new Set(allIndicators);

//   const approved = new Set<string>();

  const toCode = (sectionKey?: string): string | null => {
    if (!sectionKey) return null;
    // "section1_2" -> "1.2"
    if (sectionKey.startsWith("section")) {
      const num = sectionKey.replace(/^section/, "");
      return num.replace("_", ".");
    }
    // already "1.2"?
    if (/^\d+(\.\d+)*$/.test(sectionKey)) return sectionKey;
    return null;
  };

  const submissions = apiPayload?.data?.submissions ?? apiPayload?.submissions ?? [];

  const APPROVED_SET = new Set([
    "APPROVED",        
    "ACCEPTED",       
   
  ]);

  const approvedPaths = new Set<string>();

//   for (const sub of submissions) {
//     const statuses: any[] = sub?.statuses || [];
//     for (const s of statuses) {
//       const status = s?.status?.toUpperCase?.();
//       if (status !== "APPROVED" && status !== "ACCEPTED") continue;

//       const code = toCode(s?.sectionKey);
//       if (code && valid.has(code)) approved.add(code);
//     }
//   }

  for (const s of submissions) {
    for (const st of (s?.statuses ?? [])) {
      const status = String(st?.status ?? "").toUpperCase();
      if (APPROVED_SET.has(status)) {
        const path = st?.path || `${st?.parentKey}.${st?.sectionKey}`;
        if (path) approvedPaths.add(path);
      }
    }
  }

//   const approvedCount = approved.size;

const approved = approvedPaths.size; 
  const percentage =
    totalIndicators > 0
      ? Math.round((approved / totalIndicators) * 100)
      : 0;

  return { approved: approved, total: totalIndicators, percentage };
};