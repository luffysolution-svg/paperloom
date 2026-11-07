import { Plug } from "lucide-react";
import { AI_BRAND_MARKS } from "../../shared/ai/brand-marks.js";
import type { AiBrandKey } from "../../shared/ai/service-presets.js";

export function AiBrandMark({ brand, size = 24 }: { brand: AiBrandKey | "custom"; size?: number }) {
  const mark = brand === "custom" ? null : AI_BRAND_MARKS[brand];
  return <span className="reader-ai-brand" aria-hidden="true" style={{ width: size, height: size }}>
    {mark ? mark.monochrome ? <span className="reader-ai-brand-mask" style={{ maskImage: `url("${mark.image}")`, WebkitMaskImage: `url("${mark.image}")` }} />
      : <img src={mark.image} alt="" width={size} height={size} /> : <Plug size={size * 0.8} strokeWidth={1.7} />}
  </span>;
}
