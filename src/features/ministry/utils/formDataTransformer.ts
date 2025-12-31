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
                  if (!formData[sectionKey][subsectionName]) {
                    formData[sectionKey][subsectionName] = [];
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
 */
export function getCategoryFromSectionId(sectionId: string): string {
  if (sectionId.startsWith('1.')) return 'Infrastructure_Financing';
  if (sectionId.startsWith('2.')) return 'Infrastructure_Development';
  if (sectionId.startsWith('3.')) return 'PPP_Development';
  if (sectionId.startsWith('4.')) return 'Infrastructure_Enablers';
  return 'Infrastructure_Financing';
}

