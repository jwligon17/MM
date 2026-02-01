import type { Timestamp } from "firebase/firestore";

type FirestoreTimestamp = Timestamp | Date | { toDate: () => Date } | null;

export type SegmentAggregate = {
  cityId: string;
  h3: string;
  segmentKey: string;
  avgRoughnessPercent: number;
  samples: number;
  passes: number;
  lastAssessedAt: FirestoreTimestamp;
  lastAssessedAtDay?: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  lineStartLat: number;
  lineStartLng: number;
  lineEndLat: number;
  lineEndLng: number;
  centroidLat: number;
  centroidLng: number;
  roadTypeHint?: string | null;
  published: boolean;
};
