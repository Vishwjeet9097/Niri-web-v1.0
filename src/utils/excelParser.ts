import * as XLSX from 'xlsx';

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
export function parseCapacityBuildingExcel(file: File): Promise<ExcelParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({
            success: false,
            error: 'Failed to read file',
          });
          return;
        }

        // Parse Excel file
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve({
            success: false,
            error: 'Excel file contains no sheets',
          });
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON array
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        });

        if (jsonData.length < 2) {
          resolve({
            success: false,
            error: 'Excel file must contain at least a header row and one data row',
          });
          return;
        }

        // Parse header row (first row)
        const headerRow = jsonData[0].map((h: any) => 
          String(h || '').trim().toLowerCase()
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
          'officer name',
          'officer',
          'name',
          'officer_name'
        ]);
        
        const designationIndex = findColumnIndex([
          'designation',
          'designation name',
          'position'
        ]);
        
        const programNameIndex = findColumnIndex([
          'program name',
          'program',
          'program_name',
          'training program',
          'training program name'
        ]);
        
        const organiserIndex = findColumnIndex([
          'organizer',
          'organiser',
          'organiser name',
          'organized by',
          'organized_by'
        ]);
        
        const trainingTypeIndex = findColumnIndex([
          'type',
          'training type',
          'training_type',
          'mode',
          'training mode'
        ]);
        
        const trainingPeriodIndex = findColumnIndex([
          'conducted during',
          'training period',
          'period',
          'month/year',
          'mm/yy',
          'date',
          'training_period'
        ]);

        // Validate required columns
        const missingColumns: string[] = [];
        if (officerNameIndex === -1) missingColumns.push('Officer Name');
        if (designationIndex === -1) missingColumns.push('Designation');
        if (programNameIndex === -1) missingColumns.push('Program Name');
        if (organiserIndex === -1) missingColumns.push('Organizer');
        if (trainingTypeIndex === -1) missingColumns.push('Type');
        if (trainingPeriodIndex === -1) missingColumns.push('Conducted during (MM/YY)');

        if (missingColumns.length > 0) {
          resolve({
            success: false,
            error: `Missing required columns: ${missingColumns.join(', ')}`,
          });
          return;
        }

        // Parse data rows (skip header row)
        const entries: CapacityBuildingEntry[] = [];
        const warnings: string[] = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          // Skip empty rows
          const isEmptyRow = row.every((cell: any) => !cell || String(cell).trim() === '');
          if (isEmptyRow) continue;

          const officerName = String(row[officerNameIndex] || '').trim();
          const designation = String(row[designationIndex] || '').trim();
          const programName = String(row[programNameIndex] || '').trim();
          const organiser = String(row[organiserIndex] || '').trim();
          const trainingType = String(row[trainingTypeIndex] || '').trim();
          const trainingPeriod = String(row[trainingPeriodIndex] || '').trim();

          // Skip rows with missing required fields
          if (!officerName || !designation || !programName || !organiser || !trainingType || !trainingPeriod) {
            warnings.push(`Row ${i + 1} skipped: missing required fields`);
            continue;
          }

          // Normalize training type (capitalize first letter, check for Online/Offline)
          let normalizedType = trainingType;
          if (normalizedType.toLowerCase() === 'online' || normalizedType.toLowerCase() === 'offline') {
            normalizedType = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1).toLowerCase();
          } else {
            // If not exactly "Online" or "Offline", default based on common values
            if (normalizedType.toLowerCase().includes('online') || normalizedType.toLowerCase().includes('virtual')) {
              normalizedType = 'Online';
            } else if (normalizedType.toLowerCase().includes('offline') || normalizedType.toLowerCase().includes('physical') || normalizedType.toLowerCase().includes('in-person')) {
              normalizedType = 'Offline';
            }
          }

          // Normalize training period (MM/YY format)
          let normalizedPeriod = trainingPeriod;
          // Handle various date formats
          if (normalizedPeriod.match(/^\d{4}$/)) {
            // Format: YYYY -> assume first two digits are month
            normalizedPeriod = `${normalizedPeriod.slice(0, 2)}/${normalizedPeriod.slice(2)}`;
          } else if (normalizedPeriod.match(/^\d{2}\/\d{2}$/)) {
            // Already in MM/YY format
            normalizedPeriod = normalizedPeriod;
          } else if (normalizedPeriod.match(/^\d{2}-\d{2}$/)) {
            // MM-YY format
            normalizedPeriod = normalizedPeriod.replace('-', '/');
          } else if (normalizedPeriod.match(/^\d{1,2}\/\d{2,4}$/)) {
            // M/YY or MM/YYYY format
            const parts = normalizedPeriod.split('/');
            const month = parts[0].padStart(2, '0');
            const year = parts[1].length === 4 ? parts[1].slice(2) : parts[1];
            normalizedPeriod = `${month}/${year}`;
          }

          // Generate unique ID
          const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
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
            error: 'No valid data rows found in Excel file',
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
          error: error.message || 'Failed to parse Excel file',
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read file',
      });
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Generate a template Excel file for Capacity Building data
 */
export function generateCapacityBuildingTemplate(): void {
  const headers = [
    'Officer Name',
    'Designation',
    'Program Name',
    'Organizer',
    'Type',
    'Conducted during (MM/YY)'
  ];

  const exampleData = [
    ['John Doe', 'Engineer', 'Infrastructure Development Workshop', 'Ministry of Housing', 'Online', '01/24'],
    ['Jane Smith', 'Manager', 'PPP Training Program', 'Department of Finance', 'Offline', '02/24'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Capacity Building');

  // Auto-size columns
  const maxWidth = 50;
  worksheet['!cols'] = headers.map(() => ({ wch: maxWidth }));

  XLSX.writeFile(workbook, 'Capacity_Building_Template.xlsx');
}
