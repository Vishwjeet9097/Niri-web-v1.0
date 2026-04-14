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

        const headerRow = jsonData[0].map((h: any) =>
          String(h || "")
            .trim()
            .toLowerCase()
        );

        const findColumnIndex = (possibleNames: string[]): number => {
          for (const name of possibleNames) {
            const index = headerRow.findIndex((h: string) =>
              h.includes(name.toLowerCase())
            );
            if (index !== -1) return index;
          }
          return -1;
        };

        const ulbIdIndex = findColumnIndex([
          "ulb id",
          "ulb_id",
          "ulbid",
          "id",
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
        const ratingIndex = findColumnIndex([
          "select rating",
          "rating",
          "credit rating",
        ]);

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

        for (let i = 1; i < jsonData.length; i++) {
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
          resolve({
            success: false,
            error: "No valid data rows found in Excel file",
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
    "ULB ID",
    "ULB Name",
    "City Name",
    "Credit Rating Date",
    "Select Rating",
  ];
  const exampleData = [
    [
      "Replace with ULB ID from master list",
      "Example Municipal Corporation",
      "Example City",
      "2024-06-15",
      "AA+",
    ],
    [
      "",
      "Match by name if ID left blank",
      "City must match if multiple same name",
      "15-06-2024",
      "BBB",
    ],
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

  worksheet["!cols"] = [14, 28, 14, 22, 14].map((wch) => ({ wch }));

  XLSX.writeFile(workbook, "Credit_Rated_ULBs_1.3_Template.xlsx");
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

        // Parse header row (first row)
        const headerRow = jsonData[0].map((h: any) =>
          String(h || "")
            .trim()
            .toLowerCase()
        );

        // Find column indices
        const findColumnIndex = (possibleNames: string[]): number => {
          for (const name of possibleNames) {
            const index = headerRow.findIndex((h: string) =>
              h.includes(name.toLowerCase())
            );
            if (index !== -1) return index;
          }
          return -1;
        };

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
          resolve({
            success: false,
            error: "No valid data rows found in Excel file",
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
    "Officer Name",
    "Designation",
    "Program Name",
    "Organizer",
    "Type",
    "Conducted during (MM/YY)",
  ];

  const exampleData = [
    [
      "John Doe",
      "Engineer",
      "Infrastructure Development Workshop",
      "Ministry of Housing",
      "Online",
      "01/24",
    ],
    [
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
  const cols = ["A", "B", "C", "D", "E", "F"];
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
  const colWidths = [18, 14, 22, 18, 10, 25]; // Officer Name, Designation, Program Name, Organizer, Type, MM/YY
  worksheet["!cols"] = colWidths.map((wch) => ({ wch }));

  XLSX.writeFile(workbook, "Capacity_Building_Template.xlsx");
}
