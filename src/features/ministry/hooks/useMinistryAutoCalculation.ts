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

  // Auto-calculation for indicator 2.5: Percentage of PPP Project
  // Formula: (Total Project Cost of PPP infra projects awarded / Total Project Cost of all infra projects of the Central ministry awarded) × 100
  useEffect(() => {
    const sectionKey = "section2_5";
    const sectionData = formData[sectionKey];
    
    if (!sectionData || !assignedIndicators.length) {
      console.log("🔍 Auto-calculation 2.5: No section2_5 data or assignedIndicators");
      return;
    }

    // Find field IDs dynamically by searching through assignedIndicators
    let PPP_PROJECT_COST_FIELD_ID: string | null = null;
    let ALL_INFRA_PROJECT_COST_FIELD_ID: string | null = null;
    let PPP_PERCENTAGE_FIELD_ID: string | null = null;

    // Search for fields in the "Infra Development" indicator, section with sNo "2.5"
    for (const indicatorObj of assignedIndicators) {
      const indicatorName = Object.keys(indicatorObj)[0];
      if (indicatorName === "Infra Development" || indicatorName.toLowerCase().includes("infra development")) {
        const sections = indicatorObj[indicatorName];
        for (const sectionObj of sections) {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];
          // Check if this is indicator 2.5 by section number
          if (section.sNo === "2.5") {
            if (section.inputs && Array.isArray(section.inputs)) {
              for (const input of section.inputs) {
                const label = input.label?.toLowerCase() || "";
                if (label.includes('total project cost of ppp') && 
                    (label.includes('infra projects awarded') || label.includes('awarded'))) {
                  PPP_PROJECT_COST_FIELD_ID = input.id;
                } else if (label.includes('total project cost of all infra projects') && 
                           (label.includes('central ministry') || label.includes('ministry awarded'))) {
                  ALL_INFRA_PROJECT_COST_FIELD_ID = input.id;
                } else if (label.includes('percentage of ppp project') || 
                           label.includes('% of ppp project') ||
                           (label.includes('percentage') && label.includes('ppp'))) {
                  PPP_PERCENTAGE_FIELD_ID = input.id;
                }
              }
            }
            break;
          }
        }
      }
    }

    console.log("🔍 Auto-calculation 2.5: Found field IDs:", {
      PPP_PROJECT_COST_FIELD_ID,
      ALL_INFRA_PROJECT_COST_FIELD_ID,
      PPP_PERCENTAGE_FIELD_ID,
    });

    if (!PPP_PROJECT_COST_FIELD_ID || !ALL_INFRA_PROJECT_COST_FIELD_ID || !PPP_PERCENTAGE_FIELD_ID) {
      console.log("⚠️ Auto-calculation 2.5: Could not find all required field IDs");
      console.log("🔍 Available fields in section2_5:", Object.keys(sectionData));
      console.log("🔍 Available fields in assignedIndicators:", 
        assignedIndicators.map(ind => {
          const name = Object.keys(ind)[0];
          const sections = ind[name];
          return sections.map((sec: any) => {
            const secName = Object.keys(sec)[0];
            const secData = sec[secName];
            return {
              sectionName: secName,
              sNo: secData.sNo,
              fieldLabels: secData.inputs?.map((inp: any) => inp.label) || []
            };
          });
        })
      );
      return;
    }

    const pppProjectCostValue = sectionData[PPP_PROJECT_COST_FIELD_ID];
    const allInfraProjectCostValue = sectionData[ALL_INFRA_PROJECT_COST_FIELD_ID];
    
    console.log("🔍 Auto-calculation 2.5: Raw values:", {
      pppProjectCost: pppProjectCostValue,
      allInfraProjectCost: allInfraProjectCostValue,
      pppProjectCostType: typeof pppProjectCostValue,
      allInfraProjectCostType: typeof allInfraProjectCostValue,
    });

    const pppProjectCost = parseFloat(
      (pppProjectCostValue || "").toString().replace(/[₹,]/g, "")
    );
    const allInfraProjectCost = parseFloat(
      (allInfraProjectCostValue || "").toString().replace(/[₹,]/g, "")
    );

    console.log("🔍 Auto-calculation 2.5: Parsed values:", {
      pppProjectCost,
      allInfraProjectCost,
      isValidPppCost: !isNaN(pppProjectCost) && pppProjectCost > 0,
      isValidAllInfraCost: !isNaN(allInfraProjectCost) && allInfraProjectCost > 0,
    });

    let calculatedValue: string | number = "";
    
    const isValidPppCost = !isNaN(pppProjectCost) && pppProjectCost > 0;
    const isValidAllInfraCost = !isNaN(allInfraProjectCost) && allInfraProjectCost > 0;
    
    if (isValidPppCost && isValidAllInfraCost) {
      const percentage = (pppProjectCost / allInfraProjectCost) * 100;
      if (percentage >= 0) {
        calculatedValue = Math.round(percentage * 100) / 100;
      } else {
        calculatedValue = 0;
      }
      console.log("✅ Auto-calculation 2.5: Calculated value:", calculatedValue);
    } else {
      console.log("⚠️ Auto-calculation 2.5: Invalid values, cannot calculate");
    }

    const currentCalculatedValue = sectionData[PPP_PERCENTAGE_FIELD_ID];
    console.log("🔍 Auto-calculation 2.5: Current vs Calculated:", {
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
            [PPP_PERCENTAGE_FIELD_ID]: calculatedValue,
          },
        };
      });

      if (calculatedValue !== "" && assignedIndicators.length > 0 && PPP_PERCENTAGE_FIELD_ID) {
        let calculatedField: any = null;
        for (const indicatorObj of assignedIndicators) {
          const indicatorName = Object.keys(indicatorObj)[0];
          if (indicatorName === "Infra Development" || indicatorName.toLowerCase().includes("infra development")) {
            const sections = indicatorObj[indicatorName];
            for (const sectionObj of sections) {
              const sectionName = Object.keys(sectionObj)[0];
              const section = sectionObj[sectionName];
              if (section.sNo === "2.5") {
                if (section.inputs && Array.isArray(section.inputs)) {
                  calculatedField = section.inputs.find(
                    (input: any) => input.id === PPP_PERCENTAGE_FIELD_ID
                  );
                  if (calculatedField) break;
                }
              }
            }
          }
        }

        if (calculatedField && calculatedValue !== "") {
          const calculatedFieldPath = `${sectionKey}.${PPP_PERCENTAGE_FIELD_ID}`;
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
          const calculatedFieldPath = `${sectionKey}.${PPP_PERCENTAGE_FIELD_ID}`;
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

  // Auto-calculation for indicator 3.3: Total of all TPC of all PPP Projects
  // Formula: Sum of "Total Project Cost (INR Crore)" from all rows in the subsection array
  useEffect(() => {
    const sectionKey = "section3_3";
    const sectionData = formData[sectionKey];
    
    if (!sectionData || !assignedIndicators.length) {
      console.log("🔍 Auto-calculation 3.3: No section3_3 data or assignedIndicators");
      return;
    }

    // Find field IDs and subsection name dynamically by searching through assignedIndicators
    let TOTAL_TPC_FIELD_ID: string | null = null;
    let SUBSECTION_NAME: string | null = null;
    let TOTAL_PROJECT_COST_FIELD_ID: string | null = null;

    // Search for fields in the "PPP Development" indicator, section with sNo "3.3"
    for (const indicatorObj of assignedIndicators) {
      const indicatorName = Object.keys(indicatorObj)[0];
      if (indicatorName === "PPP Development" || indicatorName.toLowerCase().includes("ppp development")) {
        const sections = indicatorObj[indicatorName];
        for (const sectionObj of sections) {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];
          // Check if this is indicator 3.3 by section number
          if (section.sNo === "3.3") {
            // Find the total TPC field in direct inputs
            if (section.inputs && Array.isArray(section.inputs)) {
              for (const input of section.inputs) {
                const label = input.label?.toLowerCase() || "";
                if (label.includes('total of all tpc') || 
                    (label.includes('total') && label.includes('tpc') && label.includes('ppp'))) {
                  TOTAL_TPC_FIELD_ID = input.id;
                }
              }
            }
            
            // Find subsection and the Total Project Cost field within it
            if (section.subsection && Array.isArray(section.subsection) && section.subsection.length > 0) {
              for (const subsectionObj of section.subsection) {
                const subsectionName = Object.keys(subsectionObj)[0];
                const subsection = subsectionObj[subsectionName];
                SUBSECTION_NAME = subsectionName;
                
                // Find Total Project Cost field in subsection inputs
                if (subsection.inputs && Array.isArray(subsection.inputs)) {
                  for (const input of subsection.inputs) {
                    const label = input.label?.toLowerCase() || "";
                    if ((label.includes('total project cost') || label.includes('tpc')) && 
                        (label.includes('inr') || label.includes('crore'))) {
                      TOTAL_PROJECT_COST_FIELD_ID = input.id;
                      break;
                    }
                  }
                }
                break; // Use first subsection
              }
            }
            break;
          }
        }
      }
    }

    console.log("🔍 Auto-calculation 3.3: Found field IDs:", {
      TOTAL_TPC_FIELD_ID,
      SUBSECTION_NAME,
      TOTAL_PROJECT_COST_FIELD_ID,
    });

    if (!TOTAL_TPC_FIELD_ID || !SUBSECTION_NAME || !TOTAL_PROJECT_COST_FIELD_ID) {
      console.log("⚠️ Auto-calculation 3.3: Could not find all required field IDs");
      console.log("🔍 Available fields in section3_3:", Object.keys(sectionData));
      console.log("🔍 Available subsections in section3_3:", 
        sectionData ? Object.keys(sectionData).filter(key => Array.isArray(sectionData[key])) : []
      );
      console.log("🔍 Available fields in assignedIndicators:", 
        assignedIndicators.map(ind => {
          const name = Object.keys(ind)[0];
          const sections = ind[name];
          return sections.map((sec: any) => {
            const secName = Object.keys(sec)[0];
            const secData = sec[secName];
            return {
              sectionName: secName,
              sNo: secData.sNo,
              fieldLabels: secData.inputs?.map((inp: any) => inp.label) || [],
              subsectionNames: secData.subsection?.map((sub: any) => Object.keys(sub)[0]) || []
            };
          });
        })
      );
      return;
    }

    // Get the subsection array from formData
    const subsectionArray = sectionData[SUBSECTION_NAME];
    
    if (!Array.isArray(subsectionArray)) {
      console.log("⚠️ Auto-calculation 3.3: Subsection array not found or not an array");
      return;
    }

    // Calculate sum of all Total Project Cost values
    let totalSum = 0;
    let hasValidValues = false;

    subsectionArray.forEach((item: any, index: number) => {
      if (item && typeof item === 'object') {
        const projectCostValue = item[TOTAL_PROJECT_COST_FIELD_ID];
        if (projectCostValue !== null && projectCostValue !== undefined && projectCostValue !== '') {
          const projectCost = parseFloat(
            (projectCostValue || "").toString().replace(/[₹,]/g, "")
          );
          if (!isNaN(projectCost) && projectCost > 0) {
            totalSum += projectCost;
            hasValidValues = true;
          }
        }
      }
    });

    console.log("🔍 Auto-calculation 3.3: Calculation details:", {
      subsectionArrayLength: subsectionArray.length,
      totalSum,
      hasValidValues,
    });

    let calculatedValue: string | number = "";
    
    if (hasValidValues && totalSum > 0) {
      calculatedValue = Math.round(totalSum * 100) / 100;
      console.log("✅ Auto-calculation 3.3: Calculated total:", calculatedValue);
    } else {
      console.log("⚠️ Auto-calculation 3.3: No valid values to calculate");
    }

    const currentCalculatedValue = sectionData[TOTAL_TPC_FIELD_ID];
    console.log("🔍 Auto-calculation 3.3: Current vs Calculated:", {
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
            [TOTAL_TPC_FIELD_ID]: calculatedValue,
          },
        };
      });

      if (calculatedValue !== "" && assignedIndicators.length > 0 && TOTAL_TPC_FIELD_ID) {
        let calculatedField: any = null;
        for (const indicatorObj of assignedIndicators) {
          const indicatorName = Object.keys(indicatorObj)[0];
          if (indicatorName === "PPP Development" || indicatorName.toLowerCase().includes("ppp development")) {
            const sections = indicatorObj[indicatorName];
            for (const sectionObj of sections) {
              const sectionName = Object.keys(sectionObj)[0];
              const section = sectionObj[sectionName];
              if (section.sNo === "3.3") {
                if (section.inputs && Array.isArray(section.inputs)) {
                  calculatedField = section.inputs.find(
                    (input: any) => input.id === TOTAL_TPC_FIELD_ID
                  );
                  if (calculatedField) break;
                }
              }
            }
          }
        }

        if (calculatedField && calculatedValue !== "") {
          const calculatedFieldPath = `${sectionKey}.${TOTAL_TPC_FIELD_ID}`;
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
          const calculatedFieldPath = `${sectionKey}.${TOTAL_TPC_FIELD_ID}`;
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

