'use client';

import { useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

interface Mapbox3DControlsProps {
  map: mapboxgl.Map | null;
  is3DEnabled: boolean;
  setIs3DEnabled: (enabled: boolean) => void;
}

export default function Mapbox3DControls({ 
  map, 
  is3DEnabled, 
  setIs3DEnabled 
}: Mapbox3DControlsProps) {
  
  // Initialize 3D sources and buildings layer when map loads
  useEffect(() => {
    if (!map) return;

    const initializeLayers = () => {
      if (!map) return;

      // Add terrain source
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 14
        });
      }

      // Add 3D buildings layer (hidden by default)
      if (!map.getLayer('3d-buildings') && map.getSource('composite')) {
        const layers = map.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
        )?.id;

        map.addLayer(
          {
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            },
            'layout': {
              'visibility': 'none'
            }
          },
          labelLayerId
        );
      }
    };

    if (map.isStyleLoaded()) {
      initializeLayers();
    } else {
      map.once('load', initializeLayers);
    }

    // Re-initialize when style changes
    map.on('style.load', initializeLayers);

    return () => {
      map.off('style.load', initializeLayers);
    };
  }, [map]);
  
  // Toggle 3D terrain and buildings
  const toggle3D = useCallback(() => {
    if (!map) {
      console.warn('Map not ready');
      return;
    }
    
    console.log('Toggle 3D - Current state:', is3DEnabled);
    
    if (is3DEnabled) {
      // Disable 3D
      console.log('Disabling 3D...');
      map.setTerrain(null);
      map.setPitch(0);
      if (map.getLayer('sky')) {
        map.removeLayer('sky');
      }
      if (map.getLayer('3d-buildings')) {
        map.setLayoutProperty('3d-buildings', 'visibility', 'none');
      }
      setIs3DEnabled(false);
    } else {
      // Enable 3D
      console.log('Enabling 3D...');
      
      // Add terrain source if not exists
      if (!map.getSource('mapbox-dem')) {
        console.log('Adding mapbox-dem source...');
        map.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 14
        });
      }
      
      // Enable terrain
      map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
      map.setPitch(45);
      
      // Add sky layer if not exists
      if (!map.getLayer('sky')) {
        map.addLayer({
          'id': 'sky',
          'type': 'sky',
          'paint': {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 0.0],
            'sky-atmosphere-sun-intensity': 15
          }
        });
      }

      // Show 3D buildings if exists
      if (map.getLayer('3d-buildings')) {
        map.setLayoutProperty('3d-buildings', 'visibility', 'visible');
      }
      
      setIs3DEnabled(true);
    }
  }, [map, is3DEnabled, setIs3DEnabled]);

  // Expose 3D toggle to parent via window
  useEffect(() => {
    (window as any).mapbox3DToggle = toggle3D;
  }, [toggle3D]);

  return null;
}
