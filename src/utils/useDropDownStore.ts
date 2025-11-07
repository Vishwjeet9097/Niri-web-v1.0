import { create } from 'zustand';

interface DropdownState {
  formData: any;
  setFormData: (data: any) => void;
  updateSectionData: (section: string, id: string | number, field: string, value: any) => void;
}

export const useDropdownStore = create<DropdownState>((set) => ({
  formData: {},
  setFormData: (data) => set({ formData: data }),
  updateSectionData: (section, id, field, value) => 
    set((state) => ({
      formData: {
        ...state.formData,
        [section]: {
          ...state.formData[section],
          ulbList: state.formData[section]?.ulbList?.map((item: any) =>
            item.id === id ? { ...item, [field]: value } : item
          ),
        },
      },
    })),
}));