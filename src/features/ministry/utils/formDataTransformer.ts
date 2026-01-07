/**
 * Extract the actual value from submittedData based on data type
 */
function extractValueFromSubmittedData(submittedData: any, dataType: string): any {
  if (!submittedData) return null;
  
  // Return the appropriate value based on data type
  if (submittedData.valueText !== null && submittedData.valueText !== undefined) {
    return submittedData.valueText;
  }
  if (submittedData.valueNumber !== null && submittedData.valueNumber !== undefined) {
    return submittedData.valueNumber;
  }
  if (submittedData.valueDate !== null && submittedData.valueDate !== undefined) {
    return submittedData.valueDate;
  }
  if (submittedData.valueJson !== null && submittedData.valueJson !== undefined) {
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
    Object.entries(indicatorObj).forEach(([indicatorName, sections]: [string, any]) => {
      if (Array.isArray(sections)) {
        sections.forEach((sectionObj) => {
          Object.entries(sectionObj).forEach(([sectionName, section]: [string, any]) => {
            const sectionKey = `section${section.sNo.replace('.', '_')}`;
            
            if (!formData[sectionKey]) {
              formData[sectionKey] = {};
            }

            // Transform direct inputs
            if (Array.isArray(section.inputs)) {
              section.inputs.forEach((input: any) => {
                let submittedValue = null;
                
                // Handle new API format (submittedData object)
                if (input.submittedData) {
                  submittedValue = extractValueFromSubmittedData(input.submittedData, input.dataType);
                }
                // Handle old API format (submittedValue directly)
                else if (input.submittedValue !== null && input.submittedValue !== undefined) {
                  submittedValue = input.submittedValue;
                }
                
                // Set the value if we have it
                if (submittedValue !== null && submittedValue !== undefined) {
                  formData[sectionKey][input.id] = submittedValue;
                  console.log(`📝 Loaded ${sectionKey}.${input.id} =`, submittedValue);
                } else if (formData[sectionKey][input.id] === undefined) {
                  formData[sectionKey][input.id] = '';
                }
              });
            }

            // Transform subsections
            if (Array.isArray(section.subsection)) {
              section.subsection.forEach((subsection: any) => {
                Object.entries(subsection).forEach(([subsectionName, subsectionData]: [string, any]) => {
                  // Use submittedItems if available (backend now provides this)
                  if (subsectionData.submittedItems && Array.isArray(subsectionData.submittedItems) && subsectionData.submittedItems.length > 0) {
                    formData[sectionKey][subsectionName] = subsectionData.submittedItems;
                    console.log(`📝 Loaded ${sectionKey}.${subsectionName} with ${subsectionData.submittedItems.length} submitted items`);
                  } else if (formData[sectionKey][subsectionName] === undefined) {
                    // Only initialize if not exists - preserve existing data including empty arrays
                    formData[sectionKey][subsectionName] = [];
                    console.log(`📝 Initialized ${sectionKey}.${subsectionName} with empty array (no persisted data)`);
                  } else {
                    // Preserve existing data (could be empty array [] or array with items)
                    console.log(`📝 Preserving ${sectionKey}.${subsectionName}:`, 
                      Array.isArray(formData[sectionKey][subsectionName]) 
                        ? `${formData[sectionKey][subsectionName].length} items` 
                        : 'not an array'
                    );
                  }
                });
              });
            }
          });
        });
      }
    });
  });

  return formData;
}

/**
 * Get category name from section ID
 * Returns the stepKey format used by useFormPersistence (camelCase)
 */
export function getCategoryFromSectionId(sectionId: string): string | null {
  // Handle both "1.1" and "1_1" formats
  const normalizedId = sectionId.replace('_', '.');
  if (normalizedId.startsWith('1.')) return 'infraFinancing';
  if (normalizedId.startsWith('2.')) return 'infraDevelopment';
  if (normalizedId.startsWith('3.')) return 'pppDevelopment';
  if (normalizedId.startsWith('4.')) return 'infraEnablers';
  return null;
}

