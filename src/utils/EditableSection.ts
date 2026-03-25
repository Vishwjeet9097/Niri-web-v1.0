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
    set((state) => ({
      editableSections: [
        ...state.editableSections.filter(section => section.sectionId !== sectionId),
        { sectionId, isEditing }
      ]
    }));
  },

  isEditable: (sectionId: string) => {
    return get().editableSections.some(
      section => section.sectionId === sectionId && section.isEditing
    );
  },

  clearAllEditing: () => {
    set({ editableSections: [] });
  }
}));