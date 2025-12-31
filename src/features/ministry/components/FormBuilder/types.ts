export interface InputField {
  id: string;
  sectionId: string;
  label: string;
  dataType: 'string' | 'number' | 'dropdown' | 'file';
  validationRules?: {
    required?: boolean;
    options?: string[];
    [key: string]: any;
  };
  sequence: number;
}

export interface Subsection {
  [key: string]: {
    inputs: InputField[];
  };
}

export interface Section {
  [key: string]: {
    sNo: string;
    sequence: number;
    inputs: InputField[];
    subsection: Subsection[];
  };
}

export interface Indicator {
  [indicatorName: string]: Section[];
}

export interface AssignedIndicator {
  [indicatorName: string]: Section[];
}

export interface DynamicFormBuilderProps {
  indicators: Indicator[];
  formData: Record<string, any>;
  onChange: (path: string, value: any) => void;
  mode?: 'edit' | 'review';
  disabled?: boolean;
  submissionId?: string;
  getFieldError?: (path: string) => string | undefined;
  getDropdownOptions?: (
    fieldId: string, 
    sectionId: string, 
    label?: string
  ) => { value: string; label: string }[];
  onSectionSubmit?: (sectionId: string) => Promise<void>;
  isIndicatorSubmitted?: (indicatorId: string) => boolean;
}

export interface FieldRendererProps {
  field: InputField;
  value: any;
  onChange: (value: any) => void;
  mode: 'edit' | 'review';
  disabled: boolean;
  submissionId?: string;
  error?: string;
  dropdownOptions?: { value: string; label: string }[];
  className?: string;
}

export interface SubsectionRendererProps {
  subsection: Subsection;
  sectionKey: string;
  formData: any[];
  onChange: (index: number, fieldId: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  mode: 'edit' | 'review';
  disabled: boolean;
  submissionId?: string;
  getFieldError?: (path: string) => string | undefined;
  getDropdownOptions?: (
    fieldId: string, 
    sectionId: string, 
    label?: string
  ) => { value: string; label: string }[];
}

