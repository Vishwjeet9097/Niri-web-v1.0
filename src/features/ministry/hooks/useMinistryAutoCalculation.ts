import { useEffect } from "react";
import { validateField } from "../utils/validation";
import type { AssignedIndicator } from "../components/FormBuilder/types";

interface UseMinistryAutoCalculationProps {
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  assignedIndicators: AssignedIndicator[];
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function useMinistryAutoCalculation({
  formData,
  setFormData,
  assignedIndicators,
  setValidationErrors,
}: UseMinistryAutoCalculationProps) {
  // Auto-calculation for indicator 1.1: % Capex Utilization
  // Formula: (Capital Expenditure Actuals / Capital Expenditure Allocation) × 100
  useEffect(() => {
    const sectionKey = "section1_1";
    const sectionData = formData[sectionKey];
    
    if (!sectionData || !assignedIndicators.length) {
      console.log("🔍 Auto-calculation: No section1_1 data or assignedIndicators");
      return;
    }

    // Find field IDs dynamically by searching through assignedIndicators
    let CAPITAL_ALLOCATION_FIELD_ID: string | null = null;
    let CAPITAL_ACTUALS_FIELD_ID: string | null = null;
    let CAPEX_UTILIZATION_FIELD_ID: string | null = null;

    // Search for fields in the "Infra Financing" indicator, section "Capital Utilization"
    for (const indicatorObj of assignedIndicators) {
      const indicatorName = Object.keys(indicatorObj)[0];
      if (indicatorName === "Infra Financing") {
        const sections = indicatorObj[indicatorName];
        for (const sectionObj of sections) {
          const sectionName = Object.keys(sectionObj)[0];
          if (sectionName === "Capital Utilization") {
            const section = sectionObj[sectionName];
            if (section.inputs && Array.isArray(section.inputs)) {
              for (const input of section.inputs) {
                const label = input.label?.toLowerCase() || "";
                if (label.includes('capital expenditure allocation') && !label.includes('%')) {
                  CAPITAL_ALLOCATION_FIELD_ID = input.id;
                } else if (label.includes('capital expenditure actuals') || label.includes('capital expenditure actual')) {
                  CAPITAL_ACTUALS_FIELD_ID = input.id;
                } else if (label.includes('% capex utilization') || label.includes('capex utilization')) {
                  CAPEX_UTILIZATION_FIELD_ID = input.id;
                }
              }
            }
            break;
          }
        }
        break;
      }
    }

    console.log("🔍 Auto-calculation: Found field IDs:", {
      CAPITAL_ALLOCATION_FIELD_ID,
      CAPITAL_ACTUALS_FIELD_ID,
      CAPEX_UTILIZATION_FIELD_ID,
    });

    if (!CAPITAL_ALLOCATION_FIELD_ID || !CAPITAL_ACTUALS_FIELD_ID || !CAPEX_UTILIZATION_FIELD_ID) {
      console.log("⚠️ Auto-calculation: Could not find all required field IDs");
      console.log("🔍 Available fields in section1_1:", Object.keys(sectionData));
      console.log("🔍 Available fields in assignedIndicators:", 
        assignedIndicators.map(ind => {
          const name = Object.keys(ind)[0];
          const sections = ind[name];
          return sections.map((sec: any) => {
            const secName = Object.keys(sec)[0];
            const secData = sec[secName];
            return {
              sectionName: secName,
              fieldLabels: secData.inputs?.map((inp: any) => inp.label) || []
            };
          });
        })
      );
      return;
    }

    const capitalAllocationValue = sectionData[CAPITAL_ALLOCATION_FIELD_ID];
    const capitalActualsValue = sectionData[CAPITAL_ACTUALS_FIELD_ID];
    
    console.log("🔍 Auto-calculation: Raw values:", {
      capitalAllocation: capitalAllocationValue,
      capitalActuals: capitalActualsValue,
      capitalAllocationType: typeof capitalAllocationValue,
      capitalActualsType: typeof capitalActualsValue,
    });

    const capitalAllocation = parseFloat(
      (capitalAllocationValue || "").toString().replace(/[₹,]/g, "")
    );
    const capitalActuals = parseFloat(
      (capitalActualsValue || "").toString().replace(/[₹,]/g, "")
    );

    console.log("🔍 Auto-calculation: Parsed values:", {
      capitalAllocation,
      capitalActuals,
      isValidAllocation: !isNaN(capitalAllocation) && capitalAllocation > 0,
      isValidActuals: !isNaN(capitalActuals) && capitalActuals > 0,
    });

    let calculatedValue: string | number = "";
    
    const isValidAllocation = !isNaN(capitalAllocation) && capitalAllocation > 0;
    const isValidActuals = !isNaN(capitalActuals) && capitalActuals > 0;
    
    if (isValidAllocation && isValidActuals) {
      const percentage = (capitalActuals / capitalAllocation) * 100;
      if (percentage >= 0) {
        calculatedValue = Math.round(percentage * 100) / 100;
      } else {
        calculatedValue = 0;
      }
      console.log("✅ Auto-calculation: Calculated value:", calculatedValue);
    } else {
      console.log("⚠️ Auto-calculation: Invalid values, cannot calculate");
    }

    const currentCalculatedValue = sectionData[CAPEX_UTILIZATION_FIELD_ID];
    console.log("🔍 Auto-calculation: Current vs Calculated:", {
      current: currentCalculatedValue,
      calculated: calculatedValue,
      willUpdate: currentCalculatedValue !== calculatedValue,
    });
    
    if (currentCalculatedValue !== calculatedValue) {
      setFormData((prev) => {
        const sectionData = prev[sectionKey] || {};
        return {
          ...prev,
          [sectionKey]: {
            ...sectionData,
            [CAPEX_UTILIZATION_FIELD_ID]: calculatedValue,
          },
        };
      });

      if (calculatedValue !== "" && assignedIndicators.length > 0 && CAPEX_UTILIZATION_FIELD_ID) {
        let calculatedField: any = null;
        for (const indicatorObj of assignedIndicators) {
          const indicatorName = Object.keys(indicatorObj)[0];
          if (indicatorName === "Infra Financing") {
            const sections = indicatorObj[indicatorName];
            for (const sectionObj of sections) {
              const sectionName = Object.keys(sectionObj)[0];
              if (sectionName === "Capital Utilization") {
                const section = sectionObj[sectionName];
                if (section.inputs && Array.isArray(section.inputs)) {
                  calculatedField = section.inputs.find(
                    (input: any) => input.id === CAPEX_UTILIZATION_FIELD_ID
                  );
                  if (calculatedField) break;
                }
              }
            }
          }
        }

        if (calculatedField && calculatedValue !== "") {
          const calculatedFieldPath = `${sectionKey}.${CAPEX_UTILIZATION_FIELD_ID}`;
          const error = validateField(calculatedField, calculatedValue, calculatedFieldPath);
          
          setValidationErrors((prev) => {
            const newErrors = { ...prev };
            if (error) {
              newErrors[calculatedFieldPath] = error;
            } else {
              delete newErrors[calculatedFieldPath];
            }
            return newErrors;
          });
        } else if (calculatedValue === "") {
          const calculatedFieldPath = `${sectionKey}.${CAPEX_UTILIZATION_FIELD_ID}`;
          setValidationErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[calculatedFieldPath];
            return newErrors;
          });
        }
      }
    }
  }, [
    formData,
    assignedIndicators,
    setFormData,
    setValidationErrors,
  ]);
}

