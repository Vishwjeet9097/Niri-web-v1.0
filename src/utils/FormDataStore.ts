import { create } from 'zustand';

interface FormDataStore {
  // Store sections data with dynamic keys
  sectionsData: Record<string, any>;
  // Set data for a specific section
  setFormDataForSection: (data: any, sectionId: string) => void;
  // Update specific fields in a section while preserving other fields
  updateSectionField: (sectionId: string, fieldPath: string, value: any) => void;
  // Get all data for a section
  getSectionData: (sectionId: string) => any;
  // Clear all data
  clearAllData: () => void;
}

export const useFormDataStore = create<FormDataStore>((set, get) => ({
  sectionsData: {},

  setFormDataForSection: (data, sectionId) => {
    set((state) => ({
      sectionsData: {
        ...state.sectionsData,
        [sectionId]: data
      }
    }));
  },

  updateSectionField: (sectionId, fieldPath, value) => {
    set((state) => {
      const currentSectionData = state.sectionsData[sectionId] || {};
      
      // Handle nested paths (e.g., "ulbList.0.cityName")
      const updateNestedField = (obj: any, path: string[], value: any): any => {
        const [first, ...rest] = path;
        if (rest.length === 0) {
          return { ...obj, [first]: value };
        }
        return {
          ...obj,
          [first]: updateNestedField(obj[first] || {}, rest, value)
        };
      };

      const updatedSectionData = updateNestedField(
        currentSectionData,
        fieldPath.split('.'),
        value
      );

      return {
        sectionsData: {
          ...state.sectionsData,
          [sectionId]: updatedSectionData
        }
      };
    });
  },

  getSectionData: (sectionId) => {
    return get().sectionsData[sectionId] || null;
  },

  clearAllData: () => {
    set({ sectionsData: {} });
  }
}));