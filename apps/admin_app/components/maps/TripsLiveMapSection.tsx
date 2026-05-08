"use client";

import { TripsLiveMap } from "./TripsLiveMap";

type Point = {
  trip_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
  status?: string;
};

export function TripsLiveMapSection({ points }: { points: Point[] }) {
  return <TripsLiveMap points={points} />;
}

