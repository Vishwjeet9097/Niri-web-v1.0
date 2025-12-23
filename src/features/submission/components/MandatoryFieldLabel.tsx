import { Label } from "@/components/ui/label";
import { isFieldMandatory } from "../constants/mandatoryFields";

interface MandatoryFieldLabelProps {
  sectionKey: string;
  fieldName: string;
  children: React.ReactNode;
  data?: any;
  className?: string;
}

/**
 * Label component that automatically shows asterisk (*) for mandatory fields
 * based on the mandatory fields configuration
 */
export const MandatoryFieldLabel: React.FC<MandatoryFieldLabelProps> = ({
  sectionKey,
  fieldName,
  children,
  data,
  className,
}) => {
  const isMandatory = isFieldMandatory(sectionKey, fieldName, data);

  return (
    <Label className={className}>
      {children}
      {isMandatory && <span className="text-red-500">*</span>}
    </Label>
  );
};

