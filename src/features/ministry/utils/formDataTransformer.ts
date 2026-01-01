/**
 * Transforms API response structure to form data structure
 * This ensures backward compatibility with existing form data format
 */
export function transformApiResponseToFormData(
  apiResponse: any[],
  existingFormData?: Record<string, any>
): Record<string, any> {
  const formData: Record<string, any> = existingFormData || {};

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
                // Only set if not already exists (preserve user input)
                if (formData[sectionKey][input.id] === undefined) {
                  formData[sectionKey][input.id] = '';
                }
              });
            }

            // Transform subsections
            if (Array.isArray(section.subsection)) {
              section.subsection.forEach((subsection: any) => {
                Object.entries(subsection).forEach(([subsectionName, subsectionData]: [string, any]) => {
                  // CRITICAL: Only initialize if not exists - preserve existing data including empty arrays
                  // This allows deletions to persist (empty array means user deleted all items)
                  // If persisted data has an empty array [], it means user deleted all items - preserve it!
                  // If persisted data has items, preserve those items
                  // Only initialize with [] if it's truly undefined (first time, no persisted data)
                  if (formData[sectionKey][subsectionName] === undefined) {
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

