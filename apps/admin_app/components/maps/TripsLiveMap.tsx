"use client";

import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = {
  trip_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
  status?: string;
};

const icon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function TripsLiveMap({ points }: { points: Point[] }) {
  const center: [number, number] =
    points.length > 0 ? [points[0]!.lat, points[0]!.lng] : [-26.2041, 28.0473]; // Johannesburg

  type UnknownProps = Record<string, unknown>;
  const MapContainerAny = MapContainer as unknown as React.ComponentType<UnknownProps>;
  const TileLayerAny = TileLayer as unknown as React.ComponentType<UnknownProps>;
  const MarkerAny = Marker as unknown as React.ComponentType<UnknownProps>;
  const PopupAny = Popup as unknown as React.ComponentType<UnknownProps>;

  return (
    <div className="h-[420px] overflow-hidden rounded-xl border bg-white">
      <MapContainerAny center={center} zoom={12} className="h-full w-full">
        <TileLayerAny
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p) => (
          <MarkerAny key={p.trip_id} position={[p.lat, p.lng]} icon={icon}>
            <PopupAny>
              <div className="space-y-1">
                <div className="text-xs">
                  <span className="font-medium">Trip</span>{" "}
                  <span className="font-mono">{p.trip_id}</span>
                </div>
                <div className="text-xs">
                  <span className="font-medium">Driver</span>{" "}
                  <span className="font-mono">{p.driver_id}</span>
                </div>
                {p.status ? (
                  <div className="text-xs">
                    <span className="font-medium">Status</span> {p.status}
                  </div>
                ) : null}
                <div className="text-xs text-zinc-600">
                  {new Date(p.recorded_at).toLocaleString()}
                </div>
              </div>
            </PopupAny>
          </MarkerAny>
        ))}
      </MapContainerAny>
    </div>
  );
}

