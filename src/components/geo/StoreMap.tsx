'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface StoreMapProps {
  lat?: number;
  lng?: number;
  onLocationChange?: (lat: number, lng: number) => void;
  onAddressFetch?: (address: string, eloc?: string) => void;
  initialZoom?: number;
  height?: string;
  showControls?: boolean;
  markerDraggable?: boolean;
  className?: string;
}

export default function StoreMap({
  lat = 28.6139,
  lng = 77.2090,
  onLocationChange,
  onAddressFetch,
  initialZoom = 15,
  height = '400px',
  showControls = true,
  markerDraggable = true,
  className = ''
}: StoreMapProps) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const initMap = async () => {
      try {
        const L = await import('leaflet');

        if (mapRef.current) return;

        const map = L.map('store-map', {
          center: [lat, lng],
          zoom: initialZoom,
          zoomControl: showControls
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19
        }).addTo(map);

        if (markerDraggable) {
          const customIcon = L.divIcon({
            html: `
              <div style="
                width: 40px;
                height: 40px;
                background: #EF4444;
                border: 3px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
              ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
          });

          const marker = L.marker([lat, lng], {
            icon: customIcon,
            draggable: markerDraggable
          }).addTo(map);

          marker.on('dragend', async (e: any) => {
            const position = marker.getLatLng();
            onLocationChange?.(position.lat, position.lng);
          });

          markerRef.current = marker;
        } else {
          const marker = L.marker([lat, lng]).addTo(map);
          markerRef.current = marker;
        }

        map.on('click', async (e: any) => {
          const { lat: clickLat, lng: clickLng } = e.latlng;

          if (markerRef.current && markerDraggable) {
            markerRef.current.setLatLng([clickLat, clickLng]);
          }

          onLocationChange?.(clickLat, clickLng);
        });

        mapRef.current = map;
      } catch (err) {
        console.error('Leaflet init error:', err);
        setError('Failed to load map');
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isMounted, lat, lng, initialZoom, showControls, markerDraggable]);

  if (!isMounted) {
    return (
      <div
        className={`flex items-center justify-center bg-muted dark:bg-muted rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      {error && (
        <div className="absolute top-2 left-2 right-2 bg-red-100 text-red-700 px-3 py-2 rounded-lg z-[1000] text-sm">
          {error}
        </div>
      )}

      <div
        id="store-map"
        style={{ height, width: '100%' }}
        className="rounded-lg z-0"
      />

      {showControls && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-[1000]">
          <button
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.setView([lat, lng], initialZoom);
              }
            }}
            className="bg-background dark:bg-card p-2 rounded-lg shadow-md hover:bg-muted dark:hover:bg-muted transition-colors"
            title="Reset view"
          >
            <Navigation className="w-5 h-5 text-foreground" />
          </button>
        </div>
      )}

      <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
        <MapPin className="w-4 h-4" />
        {markerDraggable ? (
          <span>Drag the pin or click on map to set location</span>
        ) : (
          <span>Click on map to select location</span>
        )}
      </div>
    </div>
  );
}
