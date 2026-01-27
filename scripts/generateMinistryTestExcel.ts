import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

/**
 * Generate a test Excel file for Ministry Capacity Building with 5+ entries
 */
function generateMinistryTestExcel() {
  const headers = [
    "Officer Name",
    "Designation",
    "Training Program Name",
    "Organizer Entity",
    "Mode of Training",
    "Training Period (MM/YY)",
  ];

  // Create 5+ test entries
  const testData = [
    [
      "Rajesh Kumar",
      "Senior Engineer",
      "Infrastructure Development Workshop",
      "Ministry of Housing and Urban Affairs",
      "Online",
      "01/24",
    ],
    [
      "Priya Sharma",
      "Deputy Manager",
      "PPP Project Management Training",
      "Department of Finance",
      "Offline",
      "02/24",
    ],
    [
      "Amit Patel",
      "Assistant Director",
      "Digital Infrastructure Planning",
      "Ministry of Electronics and IT",
      "Online",
      "03/24",
    ],
    [
      "Sneha Reddy",
      "Project Coordinator",
      "Sustainable Infrastructure Development",
      "Ministry of Environment",
      "Offline",
      "04/24",
    ],
    [
      "Vikram Singh",
      "Technical Officer",
      "Smart City Implementation Program",
      "Ministry of Urban Development",
      "Online",
      "05/24",
    ],
    [
      "Anjali Mehta",
      "Senior Analyst",
      "Public-Private Partnership Framework",
      "NITI Aayog",
      "Offline",
      "06/24",
    ],
    [
      "Rahul Verma",
      "Engineer",
      "Infrastructure Asset Management",
      "Ministry of Road Transport",
      "Online",
      "07/24",
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...testData]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Capacity Building");

  // Auto-size columns
  const maxWidth = 50;
  worksheet["!cols"] = headers.map(() => ({ wch: maxWidth }));

  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), "test-files");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "Ministry_Capacity_Building_Test.xlsx");
  XLSX.writeFile(workbook, outputPath);

  console.log(`✅ Test Excel file created successfully at: ${outputPath}`);
  console.log(`📊 File contains ${testData.length} test entries`);
}

// Run if executed directly
generateMinistryTestExcel();

export { generateMinistryTestExcel };

