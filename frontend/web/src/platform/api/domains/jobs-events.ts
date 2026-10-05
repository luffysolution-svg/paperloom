import * as MockJobsEvents from "../mocks/jobs-events.js";
import { fetchJobEvents as _canonFetchJobEvents } from "@retainpdf/api/jobs-events";
import { mockable } from "./_mockable.js";

export const fetchJobEvents = mockable(_canonFetchJobEvents, MockJobsEvents.fetchJobEvents);
