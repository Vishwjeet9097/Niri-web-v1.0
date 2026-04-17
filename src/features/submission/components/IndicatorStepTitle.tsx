import { Fragment } from "react";
import { withFullForm } from "../constants/abbreviations";
import {
  INDICATOR_LIST_LABELS,
  INDICATOR_STEP_HEADINGS,
  type IndicatorTitlePart,
} from "@/utils/indicatorLabels";

function renderBodyPart(part: IndicatorTitlePart, index: number) {
  if (part.type === "text") {
    return <Fragment key={index}>{part.value}</Fragment>;
  }
  return <Fragment key={index}>{withFullForm(part.key)}</Fragment>;
}

/**
 * Section heading for submission steps: indicator code + remainder from the catalog
 * (`INDICATOR_LIST_LABELS`), except a few indicators that use `source: "parts"` for
 * inline abbreviation expansion via `abbreviations.ts`.
 */
export function IndicatorStepTitle({ code }: { code: string }) {
  const heading = INDICATOR_STEP_HEADINGS[code];
  const listText = INDICATOR_LIST_LABELS[code];
  const afterCode = heading?.afterCodeInPrimary ?? " -";

  if (heading?.source === "parts") {
    return (
      <div className="flex flex-col">
        <span className="text-base font-semibold ">
          <span className="text-primary">
            {code}
            {afterCode}
          </span>
          {heading.parts.map((part, i) => renderBodyPart(part, i))}
        </span>
      </div>
    );
  }

  const body = listText ?? code;
  return (
    <div className="flex flex-col">
      <span className="text-base font-semibold ">
        <span className="text-primary">
          {code}
          {afterCode}
        </span>
        {body}
      </span>
    </div>
  );
}
