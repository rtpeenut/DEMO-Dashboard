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

// คำนวณสีของโดรนตาม altitude (ฟุต)
export function getDroneColorByAltitude(altitudeFt: number): string {
  const altitudeM = altitudeFt * 0.3048; // แปลงฟุตเป็นเมตร
  
  if (altitudeM < 50) {
    // ต่ำมาก (0-50 m): น้ำเงินเข้ม
    return '#0047AB';
  } else if (altitudeM < 150) {
    // กลางต่ำ (50-150 m): ฟ้า
    return '#00BFFF';
  } else if (altitudeM < 300) {
    // กลาง (150-300 m): เขียวอมเหลือง
    return '#ADFF2F';
  } else if (altitudeM < 600) {
    // สูง (300-600 m): เหลือง-ส้ม (gradient)
    const ratio = (altitudeM - 300) / 300;
    return interpolateColor('#FFD700', '#FFA500', ratio);
  } else {
    // สูงมาก (>600 m): แดง-แดงเข้ม (gradient)
    const ratio = Math.min((altitudeM - 600) / 400, 1);
    return interpolateColor('#FF4500', '#FF0000', ratio);
  }
}

// ฟังก์ชันช่วยสำหรับ interpolate สีระหว่างสองสี
function interpolateColor(color1: string, color2: string, ratio: number): string {
  const hex = (c: string) => parseInt(c.substring(1), 16);
  const r1 = (hex(color1) >> 16) & 0xff;
  const g1 = (hex(color1) >> 8) & 0xff;
  const b1 = hex(color1) & 0xff;
  
  const r2 = (hex(color2) >> 16) & 0xff;
  const g2 = (hex(color2) >> 8) & 0xff;
  const b2 = hex(color2) & 0xff;
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}
