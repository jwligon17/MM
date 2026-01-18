import { merchants } from "../data/offers";
import { apiClient } from "./client";

export const fetchOffers = async () => {
  return apiClient.get(merchants);
};
