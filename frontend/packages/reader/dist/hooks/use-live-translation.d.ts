import { type ReaderLiveTranslationPort } from "../contracts/live-translation.js";
import { type LiveTranslationState } from "../shared/data/live-translation-state.js";
export type UseLiveTranslationOptions = {
    jobId: string;
    /** Authoritative status owned and refreshed by the Reader session. */
    jobStatus: string;
    enabled: boolean;
    /** Test/embedded-host override; production uses the registered Reader adapter. */
    liveTranslationPort?: ReaderLiveTranslationPort | null;
};
export declare function useLiveTranslation({ jobId, jobStatus, enabled, liveTranslationPort, }: UseLiveTranslationOptions): LiveTranslationState;
//# sourceMappingURL=use-live-translation.d.ts.map