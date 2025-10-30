export const appendFilesRecursively = (formDataObj: FormData, obj: any, parentKey = "") => {
  if (!obj || typeof obj !== "object") return;

  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    // Case 1️⃣: Direct File instance
    if (value instanceof File) {
      console.log("📎 Appending file:", fullKey, value.name);
      formDataObj.append(fullKey, value, value.name);
      return;
    }

    // Case 2️⃣: Object with `file` or `file.file`
    if (value && typeof value === "object") {
      if (value.file instanceof File) {
        console.log("📎 Appending nested file:", `${fullKey}.file`, value.file.name);
        formDataObj.append(`${fullKey}.file`, value.file, value.file.name);
      } else if (value.file?.file instanceof File) {
        console.log("📎 Appending deeply nested file:", `${fullKey}.file`, value.file.file.name);
        formDataObj.append(`${fullKey}.file`, value.file.file, value.file.file.name);
      }
    }

    // Case 3️⃣: Arrays (for e.g. section2_1[0].files[0].file)
    if (Array.isArray(value)) {
      value.forEach((item, i) => appendFilesRecursively(formDataObj, item, `${fullKey}[${i}]`));
    }

    // Case 4️⃣: Nested objects
    else if (typeof value === "object") {
      appendFilesRecursively(formDataObj, value, fullKey);
    }
  });
};
