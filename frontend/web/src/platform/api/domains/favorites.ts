import * as MockFavorites from "../mocks/favorites.js";
import {
  fetchFavorites as _canonFetchFavorites,
  createFavorite as _canonCreateFavorite,
  deleteFavorite as _canonDeleteFavorite,
} from "@retainpdf/api/favorites";
import { mockable } from "./_mockable.js";

export const fetchFavorites = mockable(_canonFetchFavorites, MockFavorites.fetchFavorites);
export const createFavorite = mockable(_canonCreateFavorite, MockFavorites.createFavorite);
export const deleteFavorite = mockable(_canonDeleteFavorite, MockFavorites.deleteFavorite);
