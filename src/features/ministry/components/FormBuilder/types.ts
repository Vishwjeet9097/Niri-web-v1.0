export interface InputField {
  id: string;
  sectionId: string;
  label: string;
  dataType: 'string' | 'number' | 'dropdown' | 'file';
  uiComponent?: string; // e.g., "Text Area", "File", "Input (Text)", etc.
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
  onChange: (path: string, value: any, field?: any) => void;
  mode?: 'edit' | 'review';
  disabled?: boolean;
  submissionId?: string;
  getFieldError?: (path: string) => string | undefined;
  getDropdownOptions?: (
    fieldId: string, 
    sectionId: string, 
    label?: string
  ) => { value: string; label: string }[];
  onSectionSubmit?: (indicatorCode: string) => void | Promise<void>;
  isIndicatorSubmitted?: (indicatorCode: string) => boolean;
  submittingIndicator?: string | null;
  validationErrors?: Record<string, string>; // Validation errors to display general message
  onValidateField?: (path: string, value: any, field: any) => void; // Real-time validation callback
  onClearFieldError?: (path: string) => void; // Clear error when user starts typing
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
  indicatorName?: string; // Indicator name (e.g., "Availability of Infrastructure Development Plan") for Yes/No field labels
  onValidate?: (path: string, value: any, field: any) => void; // Real-time validation callback
  onClearError?: (path: string) => void; // Clear error when user starts typing
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
  yesNoValue?: string | null; // Value of the Yes/No field from parent section
  onValidateField?: (path: string, value: any, field: any) => void; // Real-time validation callback
  onClearFieldError?: (path: string) => void; // Clear error when user starts typing
}

