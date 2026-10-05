// lottie / staged progress 组装：把 display 投影喂给两个动画 hook。

import { useLottieStageAnimation } from "../useLottieStageAnimation.js";
import { useStagedProgressAnimation } from "../useStagedProgressAnimation.js";
import type { StatusCardSnapshot } from "../../domain/status-card-store.js";
import type { ProgressRenderModelInput } from "../../domain/progress-model.js";
import type { StatusCardLottie, StatusCardStageDisplay } from "./types.js";

export type StatusCardMediaDerivation = {
  lottie: StatusCardLottie;
  renderOptions: ProgressRenderModelInput | null;
};

export function useStatusCardMedia({
  display,
  displaySnapshot,
  flowStageKey,
  visualStageKey,
  snapshot,
}: {
  display: StatusCardStageDisplay;
  displaySnapshot: StatusCardSnapshot;
  flowStageKey: string;
  visualStageKey: string;
  snapshot: StatusCardSnapshot;
}): StatusCardMediaDerivation {
  const lottie = useLottieStageAnimation(visualStageKey, {
    stageKey: display.selected || flowStageKey,
    current: display.selectedProgress?.current,
    total: display.selectedProgress?.total,
    progressUnit: display.selectedProgress?.progressUnit,
  }) as StatusCardLottie;

  const renderOptions = useStagedProgressAnimation({
    selected: display.selected || flowStageKey,
    selectedIsCurrent: display.selectedIsCurrent,
    snapshot: displaySnapshot,
    selectedProgress: display.selectedProgress,
    jobId: snapshot.jobId,
  }) as ProgressRenderModelInput | null;

  return { lottie, renderOptions };
}
