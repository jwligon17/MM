import { lifetimeMilesMock, weeklyPointsMock } from "../data/leaderboardMocks";
import { apiClient } from "./client";

export const fetchWeeklyLeaderboard = async () => {
  return apiClient.get(weeklyPointsMock);
};

export const fetchLifetimeLeaderboard = async () => {
  return apiClient.get(lifetimeMilesMock);
};
