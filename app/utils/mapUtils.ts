/**
 * Utility functions for map operations
 */

// แปลงพิกัดเป็น MGRS (Simplified version)
export function latLngToMGRS(lat: number, lng: number, precision: number = 5): string {
  try {
    const zone = Math.floor((lng + 180) / 6) + 1;
    const letterIndex = Math.floor((lat + 80) / 8);
    const letters = 'CDEFGHJKLMNPQRSTUVWX';
    const letter = letters[Math.max(0, Math.min(letterIndex, letters.length - 1))];
    
    const easting = Math.floor(((lng + 180) % 6) * 100000).toString().padStart(5, '0').substring(0, precision);
    const northing = Math.floor(((lat + 80) % 8) * 100000).toString().padStart(5, '0').substring(0, precision);
    
    return `${zone}${letter}PPR ${easting} ${northing}`;
  } catch (error) {
    console.error('MGRS conversion error:', error, { lat, lng });
    return 'N/A';
  }
}

// สร้างสีจาก object ID (แต่ละ ID จะได้สีไม่ซ้ำกัน)
export function getColorForObjectId(objectId: string): string {
  const colors = [
    '#FF5722', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0',
    '#00BCD4', '#E91E63', '#FF9800', '#009688', '#F44336',
    '#3F51B5', '#8BC34A', '#FFEB3B', '#673AB7', '#00E676',
  ];

  let hash = 0;
  for (let i = 0; i < objectId.length; i++) {
    hash = objectId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// หา icon name ตามประเภทวัตถุ
export function getIconName(type: string): string {
  const iconMap: Record<string, string> = {
    person: 'mdi:account',
    car: 'mdi:car',
    truck: 'mdi:truck',
    bike: 'mdi:bike',
    drone: 'healthicons:drone',
    default: 'mdi:map-marker',
  };
  return iconMap[type.toLowerCase()] || iconMap.default;
}

// ตรวจสอบว่าจุดอยู่ในเขต mark หรือไม่ (Haversine distance)
export function isInZone(lat: number, lng: number, mark: { pos: [number, number]; radius: number }): boolean {
  const R = 6371000; // รัศมีโลกเป็นเมตร
  const lat1 = mark.pos[0] * Math.PI / 180;
  const lat2 = lat * Math.PI / 180;
  const deltaLat = (lat - mark.pos[0]) * Math.PI / 180;
  const deltaLng = (lng - mark.pos[1]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= mark.radius;
}

// คำนวณระยะทางระหว่างสองจุด (Haversine)
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
