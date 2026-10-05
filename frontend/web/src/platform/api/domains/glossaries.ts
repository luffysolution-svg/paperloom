import * as MockGlossaries from "../mocks/glossaries.js";
import {
  fetchGlossaries as _canonFetchGlossaries,
  fetchGlossary as _canonFetchGlossary,
  createGlossary as _canonCreateGlossary,
  updateGlossary as _canonUpdateGlossary,
  deleteGlossary as _canonDeleteGlossary,
  exportGlossaryCsv as _canonExportGlossaryCsv,
  parseGlossaryCsv as _canonParseGlossaryCsv,
} from "@retainpdf/api/glossaries";
import { mockable } from "./_mockable.js";

export const fetchGlossariesApi = mockable(_canonFetchGlossaries, MockGlossaries.fetchGlossaries);
export const fetchGlossaryApi = mockable(_canonFetchGlossary, MockGlossaries.fetchGlossary);
export const createGlossaryApi = mockable(_canonCreateGlossary, MockGlossaries.createGlossary);
export const updateGlossaryApi = mockable(_canonUpdateGlossary, MockGlossaries.updateGlossary);
export const deleteGlossaryApi = mockable(_canonDeleteGlossary, MockGlossaries.deleteGlossary);
export const exportGlossaryCsvApi = mockable(_canonExportGlossaryCsv, MockGlossaries.exportGlossaryCsv);
export const parseGlossaryCsvApi = mockable(_canonParseGlossaryCsv, MockGlossaries.parseGlossaryCsv);
