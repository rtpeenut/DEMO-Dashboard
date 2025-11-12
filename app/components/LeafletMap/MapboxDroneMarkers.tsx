"use client";

import { useEffect, useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { Drone, subscribeDrones, subscribeDronesApi } from "@/app/libs/MapData";
import { getDroneColorByAltitude } from "@/app/utils/mapUtils";

interface MapboxDroneMarkersProps {
  map: mapboxgl.Map | null;
  onSelect?: (d: Drone) => void;
}

const SOURCE_ID = 'drones-source';
const LAYER_ID = 'drones-layer';

export default function MapboxDroneMarkers({ map, onSelect }: MapboxDroneMarkersProps) {
  const [drones, setDrones] = useState<Drone[]>([]);
  const dronesRef = useRef<Drone[]>([]);
  const onSelectRef = useRef(onSelect);
  const layersAddedRef = useRef(false);

  // Update onSelect ref
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Subscribe to drones
  useEffect(() => {
    console.log('🔌 Subscribing to drones...');
    const useApi = process.env.NEXT_PUBLIC_DATA_SOURCE === "api";
    const stop = (useApi ? subscribeDronesApi : subscribeDrones)((list) => {
      if (Array.isArray(list)) {
        console.log('📡 Received drones update:', list.length, 'drones');
        dronesRef.current = list;
        setDrones(list);
      } else {
        console.warn("⚠️ Invalid drones data:", list);
      }
    });
    
    return () => {
      console.log('🔌 Unsubscribing from drones');
      stop();
    };
  }, []);

  // Initialize source and layer
  useEffect(() => {
    if (!map) {
      console.log('⚠️ Map not ready');
      return;
    }

    const initLayers = () => {
      if (layersAddedRef.current) {
        console.log('ℹ️ Layers already added, skipping');
        return;
      }

      console.log('🔧 Initializing drone layers...');

      try {
        // Add source
        if (!map.getSource(SOURCE_ID)) {
          map.addSource(SOURCE_ID, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          });
          console.log('✅ Added source:', SOURCE_ID);
        }

        // Add layer
        if (!map.getLayer(LAYER_ID)) {
          map.addLayer({
            id: LAYER_ID,
            type: 'circle',
            source: SOURCE_ID,
            paint: {
              'circle-radius': 6,
              'circle-color': ['get', 'color'],
              'circle-opacity': 0.9,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-opacity': 0.8
            }
          });
          console.log('✅ Added layer:', LAYER_ID);

          // Add click handler
          map.on('click', LAYER_ID, (e) => {
            if (!e.features || e.features.length === 0) return;
            const feature = e.features[0];
            const droneId = feature.properties?.id;
            
            // Get fresh drone data from ref (not closure)
            const drone = dronesRef.current.find(d => d.id === droneId);
            
            if (drone) {
              console.log('🖱️ Clicked drone:', drone.callsign, '- Opening DroneDetail');
              
              // Call onSelect to show DroneDetail
              if (onSelectRef.current) {
                onSelectRef.current(drone);
              }
              
              // Also show popup with obj_id, speed_kt, alt
              const altMeters = drone.alt || (drone.altitudeFt / 3.28084);
              new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                  <div style="font-size: 12px; font-family: system-ui; padding: 4px;">
                    <strong>${drone.id}</strong><br/>
                    Speed: ${drone.speedKt.toFixed(1)} kt<br/>
                    Alt: ${altMeters.toFixed(0)} m
                  </div>
                `)
                .addTo(map);
            } else {
              console.warn('⚠️ Drone not found:', droneId);
            }
          });

          // Change cursor on hover and show tooltip
          let hoverPopup: mapboxgl.Popup | null = null;
          
          map.on('mouseenter', LAYER_ID, (e) => {
            map.getCanvas().style.cursor = 'pointer';
            
            if (!e.features || e.features.length === 0) return;
            const feature = e.features[0];
            const props = feature.properties;
            
            if (props) {
              const objId = props.obj_id || props.id;
              const speedKt = props.speed_kt || props.speed || 0;
              const alt = props.alt || (props.altitude / 3.28084) || 0;
              
              hoverPopup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: 'drone-tooltip'
              })
                .setLngLat(e.lngLat)
                .setHTML(`
                  <div style="font-size: 11px; font-family: system-ui; padding: 2px 4px;">
                    <strong>${objId}</strong><br/>
                    ${speedKt.toFixed(1)} kt | ${alt.toFixed(0)} m
                  </div>
                `)
                .addTo(map);
            }
          });
          
          map.on('mouseleave', LAYER_ID, () => {
            map.getCanvas().style.cursor = '';
            if (hoverPopup) {
              hoverPopup.remove();
              hoverPopup = null;
            }
          });
        }

        layersAddedRef.current = true;
        console.log('✅ Drone layers initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing layers:', error);
      }
    };

    if (map.isStyleLoaded()) {
      console.log('✅ Map style already loaded, initializing layers');
      initLayers();
    } else {
      console.log('⏳ Waiting for map to load...');
      map.once('load', () => {
        console.log('✅ Map loaded, initializing layers');
        initLayers();
      });
    }

    // Re-initialize on style change
    const handleStyleLoad = () => {
      console.log('🔄 Style changed, re-initializing layers');
      layersAddedRef.current = false;
      setTimeout(() => initLayers(), 100);
    };
    map.on('style.load', handleStyleLoad);

    return () => {
      map.off('style.load', handleStyleLoad);
    };
  }, [map]);

  // Update GeoJSON data when drones change
  useEffect(() => {
    if (!map) {
      console.log('⚠️ Map not ready for data update');
      return;
    }
    
    if (!layersAddedRef.current) {
      console.log('⚠️ Layers not added yet, skipping data update');
      return;
    }
    
    if (!Array.isArray(drones)) {
      console.log('⚠️ Drones is not an array');
      return;
    }

    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
    if (!source) {
      console.log('⚠️ Source not found:', SOURCE_ID);
      return;
    }

    // Convert drones to GeoJSON features
    const features = drones
      .filter(drone => drone.position && drone.position.length >= 2)
      .map(drone => {
        const [lat, lng] = drone.position;
        const color = getDroneColorByAltitude(drone.altitudeFt);
        
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [lng, lat]
          },
          properties: {
            id: drone.id,
            obj_id: drone.id, // ✅ สำหรับ tooltip
            callsign: drone.callsign,
            altitude: drone.altitudeFt,
            alt: drone.alt || drone.altitudeFt / 3.28084, // ✅ เก็บค่าเมตร
            speed: drone.speedKt,
            speed_kt: drone.speedKt, // ✅ สำหรับ tooltip
            color: color
          }
        };
      });

    source.setData({
      type: 'FeatureCollection',
      features: features
    });

    console.log('📍 Updated drone positions:', features.length, 'drones');
    if (features.length > 0) {
      console.log('📍 Sample drone:', features[0].properties.callsign, 'at', features[0].geometry.coordinates);
    }
  }, [map, drones]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!map) return;
      
      // Remove layer and source
      if (map.getLayer(LAYER_ID)) {
        map.removeLayer(LAYER_ID);
      }
      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
      }
      
      layersAddedRef.current = false;
      console.log('🧹 Cleaned up drone layers');
    };
  }, [map]);

  return null;
}
