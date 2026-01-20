import { create } from 'zustand'

interface EditableSection {
  sectionId: string;
  isEditing: boolean;
}

interface EditableSectionStore {
  editableSections: EditableSection[];
  setEditable: (sectionId: string, isEditing: boolean) => void;
  isEditable: (sectionId: string) => boolean;
  clearAllEditing: () => void;
}

export const useEditableSectionStore = create<EditableSectionStore>((set, get) => ({
  editableSections: [],
  
  setEditable: (sectionId: string, isEditing: boolean) => {
    console.log(`[EditableSectionStore] Setting section ${sectionId} to isEditing=${isEditing}`);
    set((state) => {
      const newSections = [
        ...state.editableSections.filter(section => section.sectionId !== sectionId),
        { sectionId, isEditing }
      ];
      console.log(`[EditableSectionStore] Updated editableSections:`, newSections);
      return { editableSections: newSections };
    });
  },

  isEditable: (sectionId: string) => {
    console.log("Checking if section is editable:", sectionId);
    return get().editableSections.some(
      section => section.sectionId === sectionId && section.isEditing
    );
  },

  clearAllEditing: () => {
    set({ editableSections: [] });
  }
}));