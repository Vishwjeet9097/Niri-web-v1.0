const fs = require("fs");
const path = require("path");

const filePath = "src/features/userManagement/UserManagementPage.tsx";

// Read the file
let content = fs.readFileSync(filePath, "utf8");

// Remove all console.log statements with 🔍 emoji
const debugLogRegex = /^\s*console\.log\([^)]*🔍[^)]*\);?\s*$/gm;
content = content.replace(
  debugLogRegex,
  "    // Debug logging removed for performance\n"
);

// Write back to file
fs.writeFileSync(filePath, content);

console.log("Debug logs removed from UserManagementPage.tsx");
