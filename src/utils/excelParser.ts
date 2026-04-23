import * as XLSX from "xlsx-js-style";

/** Minimal ULB shape for resolving Excel rows (matches @/services/ulb.service ULB) */
export interface CreditRatedUlbExcelUlbOption {
  id: string;
  ulb_name: string;
  city_name: string;
  ulb_type: string;
}

export interface CreditRatedUlbParsedRow {
  id: string;
  cityName: string;
  ulb: string;
  ratingDate: string;
  rating: string;
  file: null;
  noDocumentAvailable: boolean;
}

const CREDIT_RATING_VALUES = [
  "AAA",
  "AA+",
  "AA",
  "AA-",
  "A+",
  "A",
  "A-",
  "BBB+",
  "BBB",
  "BBB-",
  "BB+",
  "BB",
  "BB-",
  "B+",
  "B",
  "B-",
  "CCC",
  "CC",
  "C",
  "D",
] as const;

function normalizeCreditRating(raw: string): string {
  const t = raw.trim().replace(/\s+/g, "");
  if (!t) return "";
  const upper = t.toUpperCase();
  const exact = CREDIT_RATING_VALUES.find((r) => r === upper);
  if (exact) return exact;
  const lower = t.toLowerCase();
  const fuzzy = CREDIT_RATING_VALUES.find(
    (r) => r.toLowerCase() === lower || lower.includes(r.toLowerCase())
  );
  return fuzzy || upper;
}

function parseExcelDateCell(cell: unknown): string {
  if (cell === null || cell === undefined || cell === "") return "";
  if (cell instanceof Date && !isNaN(cell.getTime())) {
    return cell.toISOString();
  }
  if (typeof cell === "number" && !isNaN(cell)) {
    // Excel serial date (typical range)
    if (cell > 20000 && cell < 100000) {
      const ms = (cell - 25569) * 86400 * 1000;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  const s = String(cell).trim();
  if (!s) return "";
  // dd-mm-yyyy or dd/mm/yyyy
  const dmY = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmY) {
    const day = parseInt(dmY[1], 10);
    const month = parseInt(dmY[2], 10) - 1;
    const year = parseInt(dmY[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + "T12:00:00");
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();
  return "";
}

interface CreditRatedUlbParseResult {
  success: boolean;
  data?: CreditRatedUlbParsedRow[];
  error?: string;
  warnings?: string[];
}

/**
 * S.No. / Sl No / Sr No etc. (template-only, not in UI). This column must never
 * be used to resolve ULB, date, or rating, or short substrings in its header
 * (e.g. "date" inside "S.No" matching logic) can break parsing.
 */
function isExcelSerialNoColumnHeader(h: string): boolean {
  const t = h.trim().toLowerCase();
  if (!t) return false;
  const compact = t.replace(/[^a-z0-9]/g, "");
  if (compact === "sno" || compact === "slno" || compact === "srno")
    return true;
  if (
    compact === "serial" ||
    compact === "serno" ||
    compact.startsWith("serialno")
  )
    return true;
  if (t === "#" || /^#\.?\s*no\.?$/.test(t)) return true;
  return false;
}

/**
 * Parse Excel for Indicator 1.3 — columns only (no evidence file in sheet).
 * Required headers: identify ULB via "ULB ID" or "ULB Name" (+ optional "City Name"), plus rating date and rating.
 */
export function parseCreditRatedULBsExcel(
  file: File,
  ulbOptions: CreditRatedUlbExcelUlbOption[]
): Promise<CreditRatedUlbParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({ success: false, error: "Failed to read file" });
          return;
        }

        if (!ulbOptions || ulbOptions.length === 0) {
          resolve({
            success: false,
            error:
              "The ULB master list is not loaded for your state. Wait for the page to finish loading (or refresh), then try the upload again.",
          });
          return;
        }

        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve({ success: false, error: "Excel file contains no sheets" });
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        });

        if (jsonData.length < 2) {
          resolve({
            success: false,
            error:
              "Excel file must contain at least a header row and one data row",
          });
          return;
        }

        const findHeaderRowIndex = (rows: any[][]): number => {
          const max = Math.min(rows.length, 10);
          for (let r = 0; r < max; r++) {
            const row = rows[r];
            if (!Array.isArray(row)) continue;
            const cells = row.map((c) =>
              String(c ?? "")
                .trim()
                .toLowerCase()
            );
            const hasUlbName = cells.some(
              (c) =>
                c === "ulb" ||
                c === "ulb name" ||
                c.includes("ulb name") ||
                c.includes("name of ulb")
            );
            const hasRatingCol = cells.some(
              (c) =>
                c.includes("select rating") ||
                c === "rating" ||
                (c.includes("rating") && c.includes("credit"))
            );
            if (hasUlbName && hasRatingCol) return r;
          }
          return 0;
        };

        const headerRowIndex = findHeaderRowIndex(jsonData);
        const dataStartIndex = headerRowIndex + 1;
        if (dataStartIndex >= jsonData.length) {
          resolve({
            success: false,
            error: "Add at least one data row under the column headers",
          });
          return;
        }

        const headerRow = jsonData[headerRowIndex].map((h: any) =>
          String(h || "")
            .trim()
            .toLowerCase()
        );

        const snoIndex = headerRow.findIndex((h) =>
          isExcelSerialNoColumnHeader(h)
        );
        const isNotSno = (i: number) => snoIndex < 0 || i !== snoIndex;

        const findColumnIndex = (possibleNames: string[]): number => {
          for (const name of possibleNames) {
            const index = headerRow.findIndex(
              (h: string, i) => isNotSno(i) && h.includes(name.toLowerCase())
            );
            if (index !== -1) return index;
          }
          return -1;
        };

        // Do not use a bare "id" match: it can bind to the wrong column (e.g. headers
        // containing the letters "id" as a substring).
        const ulbIdIndex = findColumnIndex([
          "ulb id",
          "ulb_id",
          "ulbid",
        ]);
        const ulbNameIndex = findColumnIndex([
          "ulb name",
          "ulb",
          "ulb_name",
          "name of ulb",
        ]);
        const cityNameIndex = findColumnIndex([
          "city name",
          "city",
          "city_name",
        ]);
        const ratingDateIndex = findColumnIndex([
          "credit rating date",
          "rating date",
          "date",
        ]);
        // A bare "rating" / "credit rating" find matches "Credit Rating Date" first; that must
        // be the date column, not the grade. Prefer "Select Rating", then any "rating" column
        // whose header is not a date field, else any other "rating" column.
        let ratingIndex = findColumnIndex(["select rating"]);
        if (ratingIndex === -1) {
          ratingIndex = headerRow.findIndex(
            (h, i) =>
              isNotSno(i) &&
              h.includes("rating") &&
              !h.includes("date")
          );
        }
        if (ratingIndex === -1 && ratingDateIndex !== -1) {
          ratingIndex = headerRow.findIndex(
            (h, i) =>
              isNotSno(i) &&
              i !== ratingDateIndex &&
              h.includes("rating")
          );
        }
        if (ratingIndex !== -1 && ratingIndex === ratingDateIndex) {
          const alt = headerRow.findIndex(
            (h, i) =>
              isNotSno(i) && i !== ratingDateIndex && h.includes("rating")
          );
          if (alt !== -1) ratingIndex = alt;
        }

        const missingColumns: string[] = [];
        if (ulbIdIndex === -1 && ulbNameIndex === -1) {
          missingColumns.push("ULB ID or ULB Name");
        }
        if (ratingDateIndex === -1) {
          missingColumns.push("Credit Rating Date");
        }
        if (ratingIndex === -1) {
          missingColumns.push("Select Rating");
        }

        if (missingColumns.length > 0) {
          resolve({
            success: false,
            error: `Missing required columns: ${missingColumns.join(", ")}`,
          });
          return;
        }

        const norm = (s: unknown) =>
          String(s ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
        const normLoose = (s: unknown) =>
          norm(s).replace(/[^a-z0-9]/g, "");

        const resolveUlb = (
          ulbIdRaw: string,
          ulbNameRaw: string,
          cityRaw: string
        ): CreditRatedUlbExcelUlbOption | null => {
          const idTrim = ulbIdRaw.trim();
          if (idTrim) {
            const byId = ulbOptions.find((u) => String(u.id) === idTrim);
            if (byId) return byId;
          }
          const nameTrim = String(ulbNameRaw ?? "").trim();
          const cityTrim = String(cityRaw ?? "").trim();
          if (!nameTrim) return null;

          // Accept dropdown-style format: "ULB Name - City Name (Type)"
          let parsedName = nameTrim;
          let parsedCity = cityTrim;
          const comboMatch = nameTrim.match(/^(.*?)\s*-\s*(.*?)\s*(\(|$)/);
          if (comboMatch) {
            const extractedName = comboMatch[1]?.trim();
            const extractedCity = comboMatch[2]?.trim();
            if (extractedName) parsedName = extractedName;
            if (!parsedCity && extractedCity) parsedCity = extractedCity;
          }

          const nameN = norm(parsedName);
          const cityN = norm(parsedCity);
          const nameLoose = normLoose(parsedName);
          const cityLoose = normLoose(parsedCity);

          const candidates = ulbOptions.filter((u) => {
            const ulbName = norm(u.ulb_name);
            const ulbNameLoose = normLoose(u.ulb_name);
            // strict + loose + contains both ways for robustness
            return (
              ulbName === nameN ||
              ulbName.includes(nameN) ||
              nameN.includes(ulbName) ||
              (nameLoose.length > 0 &&
                (ulbNameLoose === nameLoose ||
                  ulbNameLoose.includes(nameLoose) ||
                  nameLoose.includes(ulbNameLoose)))
            );
          });

          if (candidates.length === 0) {
            // Fallback: if provided value is full display text, match loosely on entire string
            const wholeLoose = normLoose(nameTrim);
            const fallback = ulbOptions.filter((u) =>
              wholeLoose.includes(normLoose(u.ulb_name))
            );
            if (fallback.length === 1) return fallback[0];
            if (fallback.length > 1) {
              const byCityFallback = fallback.filter((u) =>
                cityLoose ? normLoose(u.city_name) === cityLoose : true
              );
              if (byCityFallback.length >= 1) return byCityFallback[0];
            }
            return null;
          }

          if (cityN) {
            const byCity = candidates.filter(
              (u) =>
                norm(u.city_name) === cityN ||
                norm(u.city_name).includes(cityN) ||
                cityN.includes(norm(u.city_name)) ||
                (cityLoose &&
                  (normLoose(u.city_name) === cityLoose ||
                    normLoose(u.city_name).includes(cityLoose) ||
                    cityLoose.includes(normLoose(u.city_name))))
            );
            if (byCity.length === 1) return byCity[0];
            if (byCity.length > 1) return byCity[0];
          }
          if (candidates.length === 1) return candidates[0];
          return null;
        };

        const entries: CreditRatedUlbParsedRow[] = [];
        const warnings: string[] = [];

        for (let i = dataStartIndex; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!Array.isArray(row)) continue;

          const isEmptyRow = row.every(
            (cell: any) => !cell || String(cell).trim() === ""
          );
          if (isEmptyRow) continue;

          const ulbIdCell =
            ulbIdIndex >= 0 ? String((row[ulbIdIndex] ?? "") || "").trim() : "";
          const ulbNameCell =
            ulbNameIndex >= 0
              ? String((row[ulbNameIndex] ?? "") || "").trim()
              : "";
          const cityCell =
            cityNameIndex >= 0
              ? String((row[cityNameIndex] ?? "") || "").trim()
              : "";

          const ratingDateRaw = row[ratingDateIndex!];
          const ratingRaw = String((row[ratingIndex!] ?? "") || "").trim();

          const looksLikeHeader =
            /ulb\s*id/i.test(ulbIdCell) ||
            (/^ulb\s*name$/i.test(ulbNameCell) && !ratingRaw);
          if (looksLikeHeader) continue;

          const matched = resolveUlb(ulbIdCell, ulbNameCell, cityCell);
          if (!matched) {
            warnings.push(
              `Row ${i + 1} skipped: ULB not found (check ULB ID or ULB Name / City)`
            );
            continue;
          }

          const ratingDate = parseExcelDateCell(ratingDateRaw);
          if (!ratingDate) {
            warnings.push(`Row ${i + 1} skipped: invalid Credit Rating Date`);
            continue;
          }

          const rating = normalizeCreditRating(ratingRaw);
          if (!rating || !CREDIT_RATING_VALUES.includes(rating as any)) {
            warnings.push(
              `Row ${i + 1} skipped: invalid rating (use values like AAA, AA+, BBB)`
            );
            continue;
          }

          const cityName =
            cityCell.trim() || matched.city_name || "";

          const rowId =
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `${Date.now()}-${i}`;

          entries.push({
            id: rowId,
            cityName,
            ulb: matched.id,
            ratingDate,
            rating,
            file: null,
            noDocumentAvailable: false,
          });
        }

        if (entries.length === 0) {
          const hasAnyCellInDataRows = jsonData
            .slice(dataStartIndex)
            .some(
              (row) =>
                Array.isArray(row) &&
                row.some((c) => String(c ?? "").trim() !== "")
            );
          const hasNonSnoData = jsonData
            .slice(dataStartIndex)
            .some((row) => {
              if (!Array.isArray(row)) return false;
              return row.some((c, colIdx) => {
                if (snoIndex >= 0 && colIdx === snoIndex) return false;
                return String(c ?? "").trim() !== "";
              });
            });

          let detail: string;
          if (!hasAnyCellInDataRows) {
            detail =
              "All rows under the header are empty. Add at least one data row: ULB Name, Credit Rating Date, and Select Rating, using names from the portal (same as the on-screen list). S.No. is optional in Excel and is not imported—only the other columns are used.";
          } else if (!hasNonSnoData) {
            detail =
              "Only the S.No. column has values. Enter ULB Name, date, and rating in each data row. S.No. is ignored on import; it is not sent to the server.";
          } else {
            const hint =
              "Use ULB names (or valid ULB IDs) from the portal master list, valid dates, and allowed ratings (e.g. AA+, BBB).";
            detail =
              warnings.length > 0
                ? warnings.slice(0, 6).join(" ") + (warnings.length > 6 ? " …" : "")
                : hint;
          }
          resolve({
            success: false,
            error: `No valid data rows. ${detail}`,
            warnings,
          });
          return;
        }

        resolve({
          success: true,
          data: entries,
          warnings: warnings.length > 0 ? warnings : undefined,
        });
      } catch (error: any) {
        resolve({
          success: false,
          error: error.message || "Failed to parse Excel file",
        });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, error: "Failed to read file" });
    };

    reader.readAsBinaryString(file);
  });
}

export function generateCreditRatedULBsTemplate(): void {
  const headers = [
    "S.No.",
    "ULB Name",
    "City Name",
    "Credit Rating Date",
    "Select Rating",
  ];
  // Empty example rows: sample placeholder names never match the state ULB list and
  // make uploads look "broken" if the user re-uploads the template as-is.
  const exampleData = [
    ["", "", "", "", ""],
    ["", "", "", "", ""],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Credit Rated ULBs");

  const thinBorder = { style: "thin" };
  const tableBorder = {
    top: thinBorder,
    bottom: thinBorder,
    left: thinBorder,
    right: thinBorder,
  };
  const cols = ["A", "B", "C", "D", "E"];
  const numRows = 1 + exampleData.length;

  for (let r = 1; r <= numRows; r++) {
    for (let c = 0; c < cols.length; c++) {
      const cellRef = cols[c] + r;
      const cell = worksheet[cellRef];
      if (cell) {
        cell.s = {
          border: tableBorder,
          ...(r === 1 ? { font: { bold: true } } : {}),
        };
      }
    }
  }

  worksheet["!cols"] = [8, 32, 16, 22, 14].map((wch) => ({ wch }));

  XLSX.writeFile(workbook, "Credit_Rated_ULBs_1.3_Template.xlsx");
}

export interface UlbBondParsedRow {
  id: string;
  bondType: string;
  ulb: string;
  cityName: string;
  issuingAuthority: string;
  value: string;
  tenorOfBond: string;
}

export interface InfraDevelopmentPlanParsedRow {
  id: string;
  sector: string;
  planName: string;
  planDuration: string;
  files: [];
  noDocumentAvailable: boolean;
}

export interface InvestmentReadyParsedRow {
  id: string;
  projectName: string;
  sector: string;
  status: string;
  projectSize: string;
}

export interface PPPProjectParsedRow {
  id: string;
  nameOfProject: string;
  infrastructureSector: string;
  dateOfAward: string;
  totalProjectCost: string;
  proofLinkOrText: string;
  file: null;
}

interface GenericExcelParseResult<T> {
  success: boolean;
  data?: T[];
  error?: string;
  warnings?: string[];
}

function readFirstSheetRows(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return reject(new Error("Failed to read file"));
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) return reject(new Error("Excel file contains no sheets"));
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        });
        resolve(rows as any[][]);
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsBinaryString(file);
  });
}

function createHeaderHelpers(headerRowRaw: any[]) {
  const headerRow = (headerRowRaw || []).map((h: any) =>
    String(h || "")
      .trim()
      .toLowerCase()
  );
  const snoIndex = headerRow.findIndex((h) => isExcelSerialNoColumnHeader(h));
  const isNotSno = (i: number) => snoIndex < 0 || i !== snoIndex;
  const findColumnIndex = (possibleNames: string[]): number => {
    for (const name of possibleNames) {
      const idx = headerRow.findIndex(
        (h: string, i) => isNotSno(i) && h.includes(name.toLowerCase())
      );
      if (idx !== -1) return idx;
    }
    return -1;
  };
  return { headerRow, findColumnIndex, snoIndex };
}

/** Shown when no rows are imported for bulk upload sheets (S.No. column is ignored for matching). */
function describeNoValidBulkRowsMessage(
  rows: any[][],
  dataStartIndex: number,
  snoIndex: number,
  warnings: string[] | undefined,
  dataHint: string
): string {
  const body = rows.slice(dataStartIndex);
  const hasAnyCell = body.some(
    (row) => Array.isArray(row) && row.some((c) => String(c ?? "").trim() !== "")
  );
  const hasNonSno = body.some(
    (row) =>
      Array.isArray(row) &&
      row.some(
        (c, colIdx) =>
          (snoIndex < 0 || colIdx !== snoIndex) &&
          String(c ?? "").trim() !== ""
      )
  );
  if (!hasAnyCell) {
    return `All data rows are empty. Add at least one row below the header. ${dataHint} The S.No. column (if present) is not imported.`;
  }
  if (!hasNonSno) {
    return `Only the S.No. column has values, or the rest of the row is empty. ${dataHint} S.No. is ignored on import.`;
  }
  if (warnings && warnings.length > 0) {
    return (
      warnings.slice(0, 6).join(" ") + (warnings.length > 6 ? " …" : "")
    );
  }
  return dataHint;
}

function resolveUlbByExcelValue(
  ulbOptions: CreditRatedUlbExcelUlbOption[],
  ulbIdRaw: string,
  ulbNameRaw: string,
  cityRaw: string
): CreditRatedUlbExcelUlbOption | null {
  const norm = (s: unknown) =>
    String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  const normLoose = (s: unknown) => norm(s).replace(/[^a-z0-9]/g, "");

  const idTrim = String(ulbIdRaw ?? "").trim();
  if (idTrim) {
    const byId = ulbOptions.find((u) => String(u.id) === idTrim);
    if (byId) return byId;
  }

  const nameTrim = String(ulbNameRaw ?? "").trim();
  const cityTrim = String(cityRaw ?? "").trim();
  if (!nameTrim) return null;

  let parsedName = nameTrim;
  let parsedCity = cityTrim;
  const comboMatch = nameTrim.match(/^(.*?)\s*-\s*(.*?)\s*(\(|$)/);
  if (comboMatch) {
    const extractedName = comboMatch[1]?.trim();
    const extractedCity = comboMatch[2]?.trim();
    if (extractedName) parsedName = extractedName;
    if (!parsedCity && extractedCity) parsedCity = extractedCity;
  }

  const nameN = norm(parsedName);
  const cityN = norm(parsedCity);
  const nameLoose = normLoose(parsedName);
  const cityLoose = normLoose(parsedCity);

  const candidates = ulbOptions.filter((u) => {
    const ulbName = norm(u.ulb_name);
    const ulbNameLoose = normLoose(u.ulb_name);
    return (
      ulbName === nameN ||
      ulbName.includes(nameN) ||
      nameN.includes(ulbName) ||
      (nameLoose.length > 0 &&
        (ulbNameLoose === nameLoose ||
          ulbNameLoose.includes(nameLoose) ||
          nameLoose.includes(ulbNameLoose)))
    );
  });

  if (candidates.length === 0) {
    const wholeLoose = normLoose(nameTrim);
    const fallback = ulbOptions.filter((u) =>
      wholeLoose.includes(normLoose(u.ulb_name))
    );
    if (fallback.length === 1) return fallback[0];
    if (fallback.length > 1) {
      const byCityFallback = fallback.filter((u) =>
        cityLoose ? normLoose(u.city_name) === cityLoose : true
      );
      if (byCityFallback.length > 0) return byCityFallback[0];
    }
    return null;
  }

  if (cityN) {
    const byCity = candidates.filter(
      (u) =>
        norm(u.city_name) === cityN ||
        norm(u.city_name).includes(cityN) ||
        cityN.includes(norm(u.city_name)) ||
        (cityLoose &&
          (normLoose(u.city_name) === cityLoose ||
            normLoose(u.city_name).includes(cityLoose) ||
            cityLoose.includes(normLoose(u.city_name))))
    );
    if (byCity.length > 0) return byCity[0];
  }

  return candidates[0] || null;
}

export async function parseULBBondsExcel(
  file: File,
  ulbOptions: CreditRatedUlbExcelUlbOption[]
): Promise<GenericExcelParseResult<UlbBondParsedRow>> {
  try {
    if (!ulbOptions || ulbOptions.length === 0) {
      return {
        success: false,
        error:
          "The ULB master list is not loaded. Wait for the page to finish loading, then try again.",
      };
    }
    const rows = await readFirstSheetRows(file);
    if (rows.length < 2) {
      return {
        success: false,
        error: "Excel file must contain at least a header row and one data row",
      };
    }
    const { findColumnIndex, snoIndex } = createHeaderHelpers(rows[0]);
    const bondTypeIndex = findColumnIndex(["bond type", "type of bond"]);
    const ulbIdIndex = findColumnIndex(["ulb id", "ulb_id", "ulbid"]);
    const ulbNameIndex = findColumnIndex(["ulb name", "ulb", "name of ulb"]);
    const cityNameIndex = findColumnIndex(["city name", "city"]);
    const issuingAuthorityIndex = findColumnIndex([
      "issuing authority",
      "authority",
    ]);
    const valueIndex = findColumnIndex(["value", "value (inr-crore)", "inr"]);
    const tenorIndex = findColumnIndex([
      "tenure",
      "tenor",
      "tenure of bond",
      "tenure of bond (in months)",
    ]);

    const missing: string[] = [];
    if (bondTypeIndex === -1) missing.push("Bond Type");
    if (ulbIdIndex === -1 && ulbNameIndex === -1) missing.push("ULB ID or ULB Name");
    if (issuingAuthorityIndex === -1) missing.push("Issuing Authority");
    if (valueIndex === -1) missing.push("Value (INR-CRORE)");
    if (tenorIndex === -1) missing.push("Tenure of Bond (in months)");
    if (missing.length > 0) {
      return { success: false, error: `Missing required columns: ${missing.join(", ")}` };
    }

    const data: UlbBondParsedRow[] = [];
    const warnings: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const isEmpty = row.every((c: any) => !String(c ?? "").trim());
      if (isEmpty) continue;

      const matched = resolveUlbByExcelValue(
        ulbOptions,
        ulbIdIndex >= 0 ? String(row[ulbIdIndex] ?? "").trim() : "",
        ulbNameIndex >= 0 ? String(row[ulbNameIndex] ?? "").trim() : "",
        cityNameIndex >= 0 ? String(row[cityNameIndex] ?? "").trim() : ""
      );
      if (!matched) {
        warnings.push(`Row ${i + 1} skipped: ULB not found`);
        continue;
      }

      const bondType = String(row[bondTypeIndex] ?? "").trim();
      const issuingAuthority = String(row[issuingAuthorityIndex] ?? "").trim();
      const value = String(row[valueIndex] ?? "").trim();
      const tenorOfBond = String(row[tenorIndex] ?? "").trim();
      if (!bondType || !issuingAuthority || !value || !tenorOfBond) {
        warnings.push(`Row ${i + 1} skipped: missing required fields`);
        continue;
      }

      data.push({
        id:
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${i}`,
        bondType,
        ulb: matched.id,
        cityName:
          (cityNameIndex >= 0 ? String(row[cityNameIndex] ?? "").trim() : "") ||
          matched.city_name ||
          "",
        issuingAuthority,
        value,
        tenorOfBond,
      });
    }

    if (!data.length) {
      const detail = describeNoValidBulkRowsMessage(
        rows,
        1,
        snoIndex,
        warnings,
        "Use ULB names or ULB ID from the portal list, and complete all required fields per row."
      );
      return {
        success: false,
        error: `No valid data rows. ${detail}`,
        warnings,
      };
    }
    return { success: true, data, warnings: warnings.length ? warnings : undefined };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to parse Excel file" };
  }
}

export function generateULBBondsTemplate(): void {
  const headers = [
    "S.No.",
    "Bond Type",
    "ULB ID",
    "ULB Name",
    "City Name",
    "Issuing Authority",
    "Value (INR-CRORE)",
    "Tenure of Bond (in months)",
  ];
  const rows = [
    ["1", "Municipal", "ULB001", "Example ULB", "Example City", "State Authority", "120.50", "120"],
    ["2", "Green", "", "Another ULB", "Another City", "Municipal Board", "65", "60"],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ULB Bonds 1.4");
  XLSX.writeFile(wb, "ULB_Bonds_1.4_Template.xlsx");
}

export async function parseInfraDevelopmentPlanExcel(
  file: File
): Promise<GenericExcelParseResult<InfraDevelopmentPlanParsedRow>> {
  try {
    const rows = await readFirstSheetRows(file);
    if (rows.length < 2) {
      return { success: false, error: "Excel file must contain at least a header row and one data row" };
    }
    const { findColumnIndex, snoIndex } = createHeaderHelpers(rows[0]);
    const sectorIndex = findColumnIndex(["sector"]);
    const planNameIndex = findColumnIndex(["plan name", "name"]);
    const planDurationIndex = findColumnIndex(["plan duration", "duration"]);
    const missing: string[] = [];
    if (sectorIndex === -1) missing.push("Sector");
    if (planNameIndex === -1) missing.push("Plan Name");
    if (planDurationIndex === -1) missing.push("Plan Duration");
    if (missing.length) return { success: false, error: `Missing required columns: ${missing.join(", ")}` };
    const data: InfraDevelopmentPlanParsedRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const sector = String(row[sectorIndex] ?? "").trim();
      const planName = String(row[planNameIndex] ?? "").trim();
      const planDuration = String(row[planDurationIndex] ?? "").trim();
      if (!sector && !planName && !planDuration) continue;
      if (!sector || !planName || !planDuration) continue;
      data.push({
        id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${i}`,
        sector,
        planName,
        planDuration,
        files: [],
        noDocumentAvailable: false,
      });
    }
    if (!data.length) {
      const detail = describeNoValidBulkRowsMessage(
        rows,
        1,
        snoIndex,
        undefined,
        "Each row needs Sector, Plan Name, and Plan Duration."
      );
      return { success: false, error: `No valid data rows. ${detail}` };
    }
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to parse Excel file" };
  }
}

export function generateInfraDevelopmentPlanTemplate(): void {
  const headers = ["S.No.", "Sector", "Plan Name", "Plan Duration"];
  const rows = [
    ["1", "Roads", "Urban Roads Master Plan", "2020-2030"],
    ["2", "Water Supply", "City Water Plan", "2022-2028"],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Infra Plan 2.3");
  XLSX.writeFile(wb, "Infra_Development_Plan_2.3_Template.xlsx");
}

export async function parseInvestmentReadyProjectsExcel(
  file: File
): Promise<GenericExcelParseResult<InvestmentReadyParsedRow>> {
  try {
    const rows = await readFirstSheetRows(file);
    if (rows.length < 2) {
      return { success: false, error: "Excel file must contain at least a header row and one data row" };
    }
    const { findColumnIndex, snoIndex } = createHeaderHelpers(rows[0]);
    const projectNameIndex = findColumnIndex(["project name"]);
    const sectorIndex = findColumnIndex(["sector"]);
    const statusIndex = findColumnIndex(["status"]);
    const projectSizeIndex = findColumnIndex(["project cost", "project size", "size"]);
    const missing: string[] = [];
    if (projectNameIndex === -1) missing.push("Project Name");
    if (sectorIndex === -1) missing.push("Sector");
    if (statusIndex === -1) missing.push("Status");
    if (projectSizeIndex === -1) missing.push("Project Cost (INR-CRORE)");
    if (missing.length) return { success: false, error: `Missing required columns: ${missing.join(", ")}` };
    const data: InvestmentReadyParsedRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const projectName = String(row[projectNameIndex] ?? "").trim();
      const sector = String(row[sectorIndex] ?? "").trim();
      const status = String(row[statusIndex] ?? "").trim();
      const projectSize = String(row[projectSizeIndex] ?? "").trim();
      if (!projectName && !sector && !status && !projectSize) continue;
      if (!projectName || !sector || !status || !projectSize) continue;
      data.push({
        id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${i}`,
        projectName,
        sector,
        status,
        projectSize,
      });
    }
    if (!data.length) {
      const detail = describeNoValidBulkRowsMessage(
        rows,
        1,
        snoIndex,
        undefined,
        "Each row needs Project Name, Sector, Status, and Project Cost (INR-CRORE)."
      );
      return { success: false, error: `No valid data rows. ${detail}` };
    }
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to parse Excel file" };
  }
}

export function generateInvestmentReadyProjectsTemplate(): void {
  const headers = ["S.No.", "Project Name", "Sector", "Status", "Project Cost (INR-CRORE)"];
  const rows = [
    ["1", "Urban Transport Corridor", "Roads", "DPR ready", "450"],
    ["2", "City STP Upgrade", "Water Supply", "Bid stage", "210.75"],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Investment Ready 2.4");
  XLSX.writeFile(wb, "Investment_Ready_Projects_2.4_Template.xlsx");
}

export async function parsePPPProjectsExcel(
  file: File
): Promise<GenericExcelParseResult<PPPProjectParsedRow>> {
  try {
    const rows = await readFirstSheetRows(file);
    if (rows.length < 2) {
      return { success: false, error: "Excel file must contain at least a header row and one data row" };
    }
    const { findColumnIndex, snoIndex } = createHeaderHelpers(rows[0]);
    const nameIndex = findColumnIndex(["name of awarded ppp projects", "project name"]);
    const sectorIndex = findColumnIndex(["infrastructure sector", "sector"]);
    const dateIndex = findColumnIndex(["date of award", "award date"]);
    const costIndex = findColumnIndex(["total project cost", "cost"]);
    const proofIndex = findColumnIndex(["website link", "proof", "proof link"]);
    const missing: string[] = [];
    if (nameIndex === -1) missing.push("Name of Awarded PPP Projects");
    if (sectorIndex === -1) missing.push("Infrastructure Sector");
    if (dateIndex === -1) missing.push("Date of Award");
    if (costIndex === -1) missing.push("Total Project Cost (INR-CRORE)");
    if (missing.length) return { success: false, error: `Missing required columns: ${missing.join(", ")}` };
    const data: PPPProjectParsedRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const nameOfProject = String(row[nameIndex] ?? "").trim();
      const infrastructureSector = String(row[sectorIndex] ?? "").trim();
      const dateOfAward = parseExcelDateCell(row[dateIndex]);
      const totalProjectCost = String(row[costIndex] ?? "").trim();
      const proofLinkOrText =
        proofIndex >= 0 ? String(row[proofIndex] ?? "").trim() : "";
      if (!nameOfProject && !infrastructureSector && !totalProjectCost) continue;
      if (!nameOfProject || !infrastructureSector || !dateOfAward || !totalProjectCost) continue;
      data.push({
        id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${i}`,
        nameOfProject,
        infrastructureSector,
        dateOfAward,
        totalProjectCost,
        proofLinkOrText,
        file: null,
      });
    }
    if (!data.length) {
      const detail = describeNoValidBulkRowsMessage(
        rows,
        1,
        snoIndex,
        undefined,
        "Each row needs project name, sector, date of award, and total project cost."
      );
      return { success: false, error: `No valid data rows. ${detail}` };
    }
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to parse Excel file" };
  }
}

export function generatePPPProjectsTemplate(): void {
  const headers = [
    "S.No.",
    "Name of Awarded PPP Projects",
    "Infrastructure Sector",
    "Date of Award",
    "Total Project Cost (INR-CRORE)",
    "Website Link",
  ];
  const rows = [
    ["1", "Smart Bus Terminal", "Urban Transport", "2024-05-10", "300", "https://example.com/project-1"],
    ["2", "Water Distribution Upgrade", "Water Supply", "15-07-2024", "150.5", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PPP Projects 3.4");
  XLSX.writeFile(wb, "PPP_Projects_3.4_Template.xlsx");
}

export interface CapacityBuildingEntry {
  id: string;
  officerName: string;
  designation: string;
  programName: string;
  organiser: string;
  trainingType: string;
  trainingPeriod: string; // MM/YY format
}

interface ExcelParseResult {
  success: boolean;
  data?: CapacityBuildingEntry[];
  error?: string;
  warnings?: string[];
}

/**
 * Parse Excel file and convert to Capacity Building entries
 * Expected Excel format:
 * - First row should be headers
 * - Columns: Officer Name, Designation, Program Name, Organizer, Type, Conducted during (MM/YY)
 */
export function parseCapacityBuildingExcel(
  file: File
): Promise<ExcelParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({
            success: false,
            error: "Failed to read file",
          });
          return;
        }

        // Parse Excel file
        const workbook = XLSX.read(data, { type: "binary" });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve({
            success: false,
            error: "Excel file contains no sheets",
          });
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON array
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        });

        if (jsonData.length < 2) {
          resolve({
            success: false,
            error:
              "Excel file must contain at least a header row and one data row",
          });
          return;
        }

        const { findColumnIndex, snoIndex } = createHeaderHelpers(jsonData[0] || []);

        const officerNameIndex = findColumnIndex([
          "officer name",
          "officer",
          "name",
          "officer_name",
        ]);

        const designationIndex = findColumnIndex([
          "designation",
          "designation name",
          "position",
        ]);

        const programNameIndex = findColumnIndex([
          "program name",
          "program",
          "program_name",
          "training program",
          "training program name",
        ]);

        const organiserIndex = findColumnIndex([
          "organizer",
          "organiser",
          "organiser name",
          "organized by",
          "organized_by",
        ]);

        const trainingTypeIndex = findColumnIndex([
          "type",
          "training type",
          "training_type",
          "mode",
          "training mode",
        ]);

        const trainingPeriodIndex = findColumnIndex([
          "conducted during",
          "training period",
          "period",
          "month/year",
          "mm/yy",
          "date",
          "training_period",
        ]);

        // Validate required columns
        const missingColumns: string[] = [];
        if (officerNameIndex === -1) missingColumns.push("Officer Name");
        if (designationIndex === -1) missingColumns.push("Designation");
        if (programNameIndex === -1) missingColumns.push("Program Name");
        if (organiserIndex === -1) missingColumns.push("Organizer");
        if (trainingTypeIndex === -1) missingColumns.push("Type");
        if (trainingPeriodIndex === -1)
          missingColumns.push("Conducted during (MM/YY)");

        if (missingColumns.length > 0) {
          resolve({
            success: false,
            error: `Missing required columns: ${missingColumns.join(", ")}`,
          });
          return;
        }

        // Parse data rows (skip header row)
        const entries: CapacityBuildingEntry[] = [];
        const warnings: string[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          // Ensure row is an array (sheet_to_json can return sparse or non-array in edge cases)
          if (!Array.isArray(row)) continue;

          // Skip empty rows
          const isEmptyRow = row.every(
            (cell: any) => !cell || String(cell).trim() === ""
          );
          if (isEmptyRow) continue;

          const officerName = String(
            (row[officerNameIndex] ?? "") || ""
          ).trim();
          const designation = String(
            (row[designationIndex] ?? "") || ""
          ).trim();
          const programName = String(
            (row[programNameIndex] ?? "") || ""
          ).trim();
          const organiser = String((row[organiserIndex] ?? "") || "").trim();
          const trainingType = String(
            (row[trainingTypeIndex] ?? "") || ""
          ).trim();
          const trainingPeriod = String(
            (row[trainingPeriodIndex] ?? "") || ""
          ).trim();

          // Skip duplicate header row (e.g. file has two header rows)
          const looksLikeHeader =
            /^(officer\s*name|officer|name|officer_name)$/i.test(officerName) &&
            /^(designation|position)$/i.test(designation) &&
            /^(program\s*name|program|training\s*program)$/i.test(programName);
          if (looksLikeHeader) continue;

          // Skip rows with missing required fields
          if (
            !officerName ||
            !designation ||
            !programName ||
            !organiser ||
            !trainingType ||
            !trainingPeriod
          ) {
            warnings.push(`Row ${i + 1} skipped: missing required fields`);
            continue;
          }

          // Normalize training type (capitalize first letter, check for Online/Offline)
          let normalizedType = trainingType;
          if (
            normalizedType.toLowerCase() === "online" ||
            normalizedType.toLowerCase() === "offline"
          ) {
            normalizedType =
              normalizedType.charAt(0).toUpperCase() +
              normalizedType.slice(1).toLowerCase();
          } else {
            // If not exactly "Online" or "Offline", default based on common values
            if (
              normalizedType.toLowerCase().includes("online") ||
              normalizedType.toLowerCase().includes("virtual")
            ) {
              normalizedType = "Online";
            } else if (
              normalizedType.toLowerCase().includes("offline") ||
              normalizedType.toLowerCase().includes("physical") ||
              normalizedType.toLowerCase().includes("in-person")
            ) {
              normalizedType = "Offline";
            }
          }

          // Normalize training period (MM/YY format)
          let normalizedPeriod = trainingPeriod;
          // Handle various date formats
          if (normalizedPeriod.match(/^\d{4}$/)) {
            // Format: YYYY -> assume first two digits are month
            normalizedPeriod = `${normalizedPeriod.slice(
              0,
              2
            )}/${normalizedPeriod.slice(2)}`;
          } else if (normalizedPeriod.match(/^\d{2}\/\d{2}$/)) {
            // Already in MM/YY format
            normalizedPeriod = normalizedPeriod;
          } else if (normalizedPeriod.match(/^\d{2}-\d{2}$/)) {
            // MM-YY format
            normalizedPeriod = normalizedPeriod.replace("-", "/");
          } else if (normalizedPeriod.match(/^\d{1,2}\/\d{2,4}$/)) {
            // M/YY or MM/YYYY format
            const parts = normalizedPeriod.split("/");
            const month = parts[0].padStart(2, "0");
            const year = parts[1].length === 4 ? parts[1].slice(2) : parts[1];
            normalizedPeriod = `${month}/${year}`;
          }

          // Generate unique ID
          const id =
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `${Date.now()}-${i}`;

          entries.push({
            id,
            officerName,
            designation,
            programName,
            organiser,
            trainingType: normalizedType,
            trainingPeriod: normalizedPeriod,
          });
        }

        if (entries.length === 0) {
          const detail = describeNoValidBulkRowsMessage(
            jsonData,
            1,
            snoIndex,
            warnings,
            "Fill Officer Name, Designation, Program Name, Organizer, Type, and Conducted during (MM/YY) for each row."
          );
          resolve({
            success: false,
            error: `No valid data rows. ${detail}`,
            warnings,
          });
          return;
        }

        resolve({
          success: true,
          data: entries,
          warnings: warnings.length > 0 ? warnings : undefined,
        });
      } catch (error: any) {
        resolve({
          success: false,
          error: error.message || "Failed to parse Excel file",
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: "Failed to read file",
      });
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Generate a template Excel file for Capacity Building data
 * Headers are bold and the table has an outline border
 */
export function generateCapacityBuildingTemplate(): void {
  const headers = [
    "S.No.",
    "Officer Name",
    "Designation",
    "Program Name",
    "Organizer",
    "Type",
    "Conducted during (MM/YY)",
  ];

  const exampleData = [
    [
      "1",
      "John Doe",
      "Engineer",
      "Infrastructure Development Workshop",
      "Ministry of Housing",
      "Online",
      "01/24",
    ],
    [
      "2",
      "Jane Smith",
      "Manager",
      "PPP Training Program",
      "Department of Finance",
      "Offline",
      "02/24",
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Capacity Building");

  // Apply bold headers and table outline
  const thinBorder = { style: "thin" };
  const tableBorder = {
    top: thinBorder,
    bottom: thinBorder,
    left: thinBorder,
    right: thinBorder,
  };
  const cols = ["A", "B", "C", "D", "E", "F", "G"];
  const numRows = 1 + exampleData.length;

  for (let r = 1; r <= numRows; r++) {
    for (let c = 0; c < cols.length; c++) {
      const cellRef = cols[c] + r;
      const cell = worksheet[cellRef];
      if (cell) {
        cell.s = {
          border: tableBorder,
          ...(r === 1 ? { font: { bold: true } } : {}),
        };
      }
    }
  }

  // Column widths (narrower for a compact table)
  const colWidths = [8, 18, 14, 22, 18, 10, 25]; // S.No., Officer Name, Designation, Program Name, Organizer, Type, MM/YY
  worksheet["!cols"] = colWidths.map((wch) => ({ wch }));

  XLSX.writeFile(workbook, "Capacity_Building_Template.xlsx");
}
