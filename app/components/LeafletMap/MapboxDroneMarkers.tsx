"use client";

import { useEffect, useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { Drone, subscribeDrones, subscribeDronesApi } from "@/app/libs/MapData";
import { getDroneColorByAltitude } from "@/app/utils/mapUtils";

interface MapboxDroneMarkersProps {
  map: mapboxgl.Map | null;
  drones: Drone[]; // ✅ รับข้อมูลจาก props แทนการ subscribe เอง
  onSelect?: (d: Drone) => void;
  followDrone?: Drone | null;
}

const SOURCE_ID = 'drones-source';
const LAYER_ID = 'drones-layer';
const PULSE_SOURCE_ID = 'drone-pulse-source';
const PULSE_LAYER_ID = 'drone-pulse-layer';

export default function MapboxDroneMarkers({ map, onSelect, followDrone }: MapboxDroneMarkersProps) {
  const [drones, setDrones] = useState<Drone[]>([]);
  const dronesRef = useRef<Drone[]>([]);
  const onSelectRef = useRef(onSelect);
  const layersAddedRef = useRef(false);
  const pulseLayersAddedRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Update refs
  useEffect(() => {
    dronesRef.current = drones;
    onSelectRef.current = onSelect;
  }, [drones, onSelect]);

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
        // ✅ Add pulse source and layers FIRST (so they appear below drone layer)
        if (!map.getSource(PULSE_SOURCE_ID)) {
          map.addSource(PULSE_SOURCE_ID, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          });
        }

        // Add pulse layers (3 concentric circles) - these will be below drone layer
        for (let i = 1; i <= 3; i++) {
          const layerId = `${PULSE_LAYER_ID}-${i}`;
          if (!map.getLayer(layerId)) {
            map.addLayer({
              id: layerId,
              type: 'circle',
              source: PULSE_SOURCE_ID,
              paint: {
                'circle-radius': 0,
                'circle-color': '#f59e0b', // amber-500
                'circle-opacity': 0
              }
            });
          }
        }

        // Add drone source
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

        // Add drone layer (this will be on top of pulse layers)
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
    console.log('🔍 Processing drones:', drones.length, 'total');
    const features = drones
      .filter(drone => {
        const hasPosition = drone.position && Array.isArray(drone.position) && drone.position.length >= 2;
        if (!hasPosition) {
          console.warn('⚠️ Drone missing position:', drone.id, drone.position);
        }
        return hasPosition;
      })
      .map(drone => {
        const [lat, lng] = drone.position;
        const color = getDroneColorByAltitude(drone.altitudeFt);
        
        console.log('✅ Creating marker for:', drone.id, 'at', [lng, lat]);
        
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [lng, lat]
          },
          properties: {
            id: drone.id,
            obj_id: drone.id,
            callsign: drone.callsign,
            altitude: drone.altitudeFt,
            alt: drone.alt || drone.altitudeFt / 3.28084,
            speed: drone.speedKt,
            speed_kt: drone.speedKt,
            color: color
          }
        };
      });

    source.setData({
      type: 'FeatureCollection',
      features: features
    });

    console.log('📍 Updated drone positions:', features.length, 'drones visible on map');
    if (features.length > 0) {
      console.log('📍 Sample drone:', features[0].properties.callsign, 'at', features[0].geometry.coordinates);
    } else {
      console.warn('⚠️ No drones to display on map!');
    }
  }, [map, drones]);

  // Add pulsing wave effect for followed drone
  useEffect(() => {
    if (!map) return;

    // ✅ ถ้าไม่มี followDrone ให้ซ่อนวงคลื่น
    if (!followDrone || !followDrone.position) {
      // Hide pulse layers
      for (let i = 1; i <= 3; i++) {
        const layerId = `${PULSE_LAYER_ID}-${i}`;
        const layer = map.getLayer(layerId);
        if (layer) {
          map.setPaintProperty(layerId, 'circle-opacity', 0);
        }
      }
      
      // Clear pulse source data
      const source = map.getSource(PULSE_SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: []
        });
      }
      
      return;
    }

    // Animate pulse
    let startTime = Date.now();
    const duration = 2000; // 2 seconds per pulse
    const maxRadius = 50;

    const animate = () => {
      // ✅ ดึงตำแหน่งล่าสุดของโดรนจาก dronesRef
      const currentDrone = dronesRef.current.find(d => d.id === followDrone.id);
      
      const source = map.getSource(PULSE_SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (source && currentDrone && currentDrone.position) {
        const elapsed = Date.now() - startTime;
        const progress = (elapsed % duration) / duration;
        
        const [lat, lng] = currentDrone.position;
        source.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            properties: {}
          }]
        });

        // Animate 3 waves with different delays
        for (let i = 1; i <= 3; i++) {
          const layerId = `${PULSE_LAYER_ID}-${i}`;
          const layer = map.getLayer(layerId);
          if (layer) {
            const delay = (i - 1) * 0.33; // Stagger waves
            const waveProgress = (progress + delay) % 1;
            const radius = waveProgress * maxRadius;
            const opacity = Math.max(0, 0.6 * (1 - waveProgress));

            map.setPaintProperty(layerId, 'circle-radius', radius);
            map.setPaintProperty(layerId, 'circle-opacity', opacity);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [map, followDrone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!map) return;
      
      // Cancel animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Remove pulse layers
      for (let i = 1; i <= 3; i++) {
        const layerId = `${PULSE_LAYER_ID}-${i}`;
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      }
      if (map.getSource(PULSE_SOURCE_ID)) {
        map.removeSource(PULSE_SOURCE_ID);
      }
      
      // Remove drone layers
      if (map.getLayer(LAYER_ID)) {
        map.removeLayer(LAYER_ID);
      }
      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
      }
      
      layersAddedRef.current = false;
      pulseLayersAddedRef.current = false;
      console.log('🧹 Cleaned up drone layers');
    };
  }, [map]);

  return null;
}
