import { apiClient } from "./client";

export const fetchPoints = async () => {
  const mockPoints = {
    balance: 1000,
    pointEvents: [],
  };

  return apiClient.get(mockPoints);
};

export const syncPointEvents = async (events = []) => {
  return apiClient.post("/points/events", {
    status: "synced",
    count: Array.isArray(events) ? events.length : 0,
    lastSyncedAt: new Date().toISOString(),
  });
};
