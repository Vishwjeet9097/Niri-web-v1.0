/**
 * Extract the actual value from submittedData based on data type
 */
function extractValueFromSubmittedData(
  submittedData: any,
  dataType: string
): any {
  if (!submittedData) return null;

  // Return the appropriate value based on data type
  if (
    submittedData.valueText !== null &&
    submittedData.valueText !== undefined
  ) {
    return submittedData.valueText;
  }
  if (
    submittedData.valueNumber !== null &&
    submittedData.valueNumber !== undefined
  ) {
    return submittedData.valueNumber;
  }
  if (
    submittedData.valueDate !== null &&
    submittedData.valueDate !== undefined
  ) {
    return submittedData.valueDate;
  }
  if (
    submittedData.valueJson !== null &&
    submittedData.valueJson !== undefined
  ) {
    return submittedData.valueJson;
  }

  return null;
}

/**
 * Transforms API response structure to form data structure
 * Handles both old format (submittedValue) and new format (submittedData)
 */
export function transformApiResponseToFormData(
  apiResponse: any[],
  existingFormData?: Record<string, any>
): Record<string, any> {
  const formData: Record<string, any> = existingFormData || {};

  console.log("🔄 Transforming API response to form data:", apiResponse);

  apiResponse.forEach((indicatorObj) => {
    Object.entries(indicatorObj).forEach(
      ([indicatorName, sections]: [string, any]) => {
        if (Array.isArray(sections)) {
          sections.forEach((sectionObj) => {
            Object.entries(sectionObj).forEach(
              ([sectionName, section]: [string, any]) => {
                const sectionKey = `section${section.sNo.replace(".", "_")}`;

                if (!formData[sectionKey]) {
                  formData[sectionKey] = {};
                }

                // Transform direct inputs
                if (Array.isArray(section.inputs)) {
                  section.inputs.forEach((input: any) => {
                    let submittedValue = null;

                    // Handle new API format (submittedData object)
                    if (input.submittedData) {
                      submittedValue = extractValueFromSubmittedData(
                        input.submittedData,
                        input.dataType
                      );
                    }
                    // Handle old API format (submittedValue directly)
                    else if (
                      input.submittedValue !== null &&
                      input.submittedValue !== undefined
                    ) {
                      submittedValue = input.submittedValue;
                    }

                    // Set the value if we have it
                    if (
                      submittedValue !== null &&
                      submittedValue !== undefined
                    ) {
                      formData[sectionKey][input.id] = submittedValue;
                      console.log(
                        `📝 Loaded ${sectionKey}.${input.id} =`,
                        submittedValue
                      );
                    } else if (formData[sectionKey][input.id] === undefined) {
                      formData[sectionKey][input.id] = "";
                    }
                  });
                }

                // Transform subsections - Generic handler for ALL subsections across ALL indicators
                if (Array.isArray(section.subsection)) {
                  section.subsection.forEach((subsection: any) => {
                    Object.entries(subsection).forEach(
                      ([subsectionName, subsectionData]: [string, any]) => {
                        console.log(
                          `🔄 Processing subsection: ${sectionKey}.${subsectionName}`
                        );

                        // Use submittedItems if available (backend now provides this)
                        if (
                          subsectionData.submittedItems &&
                          Array.isArray(subsectionData.submittedItems)
                        ) {
                          let transformedItems: any[] = [];

                          // Generic handler for different structures of submittedItems
                          // Structure 1: [[item1, item2, ...], [item1, item2, ...]] - array of arrays, each inner array is one entry
                          // Structure 2: [[item1, item2, item3, ...]] - array with one inner array containing all items flattened
                          // Structure 3: [item1, item2, item3, ...] - single flattened array

                          let itemsToProcess: any[] = [];
                          let structureType = "";

                          // Get the number of unique inputIds from subsection inputs to determine fields per entry
                          // This is generic and works for ANY subsection regardless of field count
                          const inputIds = new Set<string>();
                          if (
                            subsectionData.inputs &&
                            Array.isArray(subsectionData.inputs)
                          ) {
                            subsectionData.inputs.forEach((input: any) => {
                              if (input && input.id) {
                                inputIds.add(input.id);
                              }
                            });
                          }
                          const fieldsPerEntry =
                            inputIds.size > 0 ? inputIds.size : 1;

                          // Generic structure detection - works for any data structure
                          if (
                            subsectionData.submittedItems.length > 0 &&
                            Array.isArray(subsectionData.submittedItems[0])
                          ) {
                            const firstElement =
                              subsectionData.submittedItems[0];

                            // Generic detection logic:
                            // - If submittedItems has multiple arrays (length > 1), it's Structure 1 (array of arrays)
                            // - If submittedItems has one array, check if it contains objects with inputId:
                            //   - If array length > fieldsPerEntry, it's Structure 2 (flattened array wrapped)
                            //   - Otherwise, it's Structure 1 with just one entry

                            if (subsectionData.submittedItems.length > 1) {
                              // Structure 1: Array of arrays - each inner array is one entry
                              // Generic transformation - works for any number of entries and fields
                              structureType = "array-of-arrays";
                              console.log(
                                `📦 Structure 1 detected: Array of arrays. Total entries: ${subsectionData.submittedItems.length}`
                              );
                              transformedItems = subsectionData.submittedItems
                                .map((itemArray: any[]) => {
                                  if (!Array.isArray(itemArray)) {
                                    return itemArray;
                                  }

                                  // Generic transformation - converts any array of items to object
                                  const itemObject: Record<string, any> = {};
                                  itemArray.forEach((item: any) => {
                                    if (item && item.inputId) {
                                      const value =
                                        extractValueFromSubmittedData(
                                          {
                                            valueText: item.valueText,
                                            valueNumber: item.valueNumber,
                                            valueDate: item.valueDate,
                                            valueJson: item.valueJson,
                                          },
                                          item.dataType || "string"
                                        );
                                      itemObject[item.inputId] = value;
                                    }
                                  });
                                  return itemObject;
                                })
                                .filter(
                                  (obj: any) => Object.keys(obj).length > 0
                                ); // Filter out empty objects
                            } else if (
                              firstElement.length > 0 &&
                              firstElement[0] &&
                              typeof firstElement[0] === "object" &&
                              firstElement[0].inputId
                            ) {
                              // Only one array - check if it's flattened or a single entry
                              // Generic check: compare length with fieldsPerEntry (works for any field count)
                              if (firstElement.length > fieldsPerEntry) {
                                // Structure 2: [[item1, item2, ...]] - flattened array wrapped in array
                                // Generic grouping - works for any number of fields and entries
                                itemsToProcess = firstElement;
                                structureType = "flattened-array-wrapped";
                                console.log(
                                  `📦 Structure 2 detected: Flattened array wrapped in array. Total items: ${itemsToProcess.length}, Fields per entry: ${fieldsPerEntry}`
                                );
                              } else {
                                // Structure 1: Single entry in array format
                                // Generic transformation - works for any field count
                                structureType = "array-of-arrays-single";
                                console.log(
                                  `📦 Structure 1 detected: Single entry in array format. Total items: ${firstElement.length}`
                                );
                                const itemObject: Record<string, any> = {};
                                firstElement.forEach((item: any) => {
                                  if (item && item.inputId) {
                                    const value = extractValueFromSubmittedData(
                                      {
                                        valueText: item.valueText,
                                        valueNumber: item.valueNumber,
                                        valueDate: item.valueDate,
                                        valueJson: item.valueJson,
                                      },
                                      item.dataType || "string"
                                    );
                                    itemObject[item.inputId] = value;
                                  }
                                });
                                if (Object.keys(itemObject).length > 0) {
                                  transformedItems.push(itemObject);
                                }
                              }
                            } else {
                              // Empty or invalid structure - log but don't fail
                              console.warn(
                                `⚠️ Warning: ${sectionKey}.${subsectionName} - Invalid or empty structure detected`
                              );
                              transformedItems = [];
                            }
                          } else {
                            // Structure 3: Single flattened array
                            // Generic handling - works for any field count
                            itemsToProcess = subsectionData.submittedItems;
                            structureType = "single-flattened-array";
                            console.log(
                              `📦 Structure 3 detected: Single flattened array. Total items: ${itemsToProcess.length}`
                            );
                          }

                          // Generic grouping logic - works for any number of fields and entries
                          if (itemsToProcess.length > 0 && fieldsPerEntry > 0) {
                            console.log(
                              `📊 Subsection ${subsectionName}: ${fieldsPerEntry} fields per entry, ${itemsToProcess.length} total items`
                            );

                            // Validate that items can be evenly divided (warn but still process)
                            if (itemsToProcess.length % fieldsPerEntry !== 0) {
                              console.warn(
                                `⚠️ Warning: ${sectionKey}.${subsectionName} - Items count (${itemsToProcess.length}) is not evenly divisible by fields per entry (${fieldsPerEntry}). Processing anyway...`
                              );
                            }

                            // Generic grouping - groups items by fieldsPerEntry (works for any field count)
                            for (
                              let i = 0;
                              i < itemsToProcess.length;
                              i += fieldsPerEntry
                            ) {
                              const entryItems = itemsToProcess.slice(
                                i,
                                i + fieldsPerEntry
                              );
                              const itemObject: Record<string, any> = {};

                              entryItems.forEach((item: any) => {
                                if (item && item.inputId) {
                                  const value = extractValueFromSubmittedData(
                                    {
                                      valueText: item.valueText,
                                      valueNumber: item.valueNumber,
                                      valueDate: item.valueDate,
                                      valueJson: item.valueJson,
                                    },
                                    item.dataType || "string"
                                  );
                                  itemObject[item.inputId] = value;
                                }
                              });

                              // Only add if object has at least one property
                              if (Object.keys(itemObject).length > 0) {
                                transformedItems.push(itemObject);
                              }
                            }
                          }

                          // Store transformed items - generic for all subsections
                          formData[sectionKey][subsectionName] =
                            transformedItems;
                          console.log(
                            `✅ Successfully loaded ${sectionKey}.${subsectionName} with ${transformedItems.length} transformed entries (structure: ${structureType})`
                          );
                        } else if (
                          formData[sectionKey][subsectionName] === undefined
                        ) {
                          // Only initialize if not exists - preserve existing data including empty arrays
                          formData[sectionKey][subsectionName] = [];
                          console.log(
                            `📝 Initialized ${sectionKey}.${subsectionName} with empty array (no persisted data)`
                          );
                        } else {
                          // Preserve existing data (could be empty array [] or array with items)
                          console.log(
                            `📝 Preserving ${sectionKey}.${subsectionName}:`,
                            Array.isArray(formData[sectionKey][subsectionName])
                              ? `${formData[sectionKey][subsectionName].length} items`
                              : "not an array"
                          );
                        }
                      }
                    );
                  });
                }
              }
            );
          });
        }
      }
    );
  });

  return formData;
}

/**
 * Get category name from section ID
 * Returns the stepKey format used by useFormPersistence (camelCase)
 */
export function getCategoryFromSectionId(sectionId: string): string | null {
  // Handle both "1.1" and "1_1" formats
  const normalizedId = sectionId.replace("_", ".");
  if (normalizedId.startsWith("1.")) return "infraFinancing";
  if (normalizedId.startsWith("2.")) return "infraDevelopment";
  if (normalizedId.startsWith("3.")) return "pppDevelopment";
  if (normalizedId.startsWith("4.")) return "infraEnablers";
  return null;
}
