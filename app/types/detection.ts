/**
 * Types สำหรับข้อมูลการตรวจจับวัตถุ
 */

// วัตถุที่ตรวจพบแต่ละชิ้น
export interface DetectedObject {
  obj_id: string;      // รหัสประจำตัววัตถุ เช่น "obj_001"
  type: string;        // ประเภทวัตถุ เช่น "drone", "person", "car"
  lat: string;         // พิกัด Latitude (API ส่งมาเป็น string)
  lng: string;         // พิกัด Longitude (API ส่งมาเป็น string)
  objective: string;   // วัตถุประสงค์ เช่น "unknown", "our", "enemy"
  size: string;        // ขนาดวัตถุ เช่น "small", "medium", "large"
  details: string | null; // รายละเอียดเพิ่มเติม
}

// ข้อมูลกล้อง
export interface Camera {
  id: string;          // UUID ของกล้อง
  name: string;        // ชื่อกล้อง เช่น "Team Alpha"
  location: string;    // ตำแหน่งกล้อง "defence" หรือ "offence"
  token: string;       // Token สำหรับ authentication
  sort: number;        // ลำดับการแสดงผล
  Institute: string;   // ชื่อสถาบัน
}

// เหตุการณ์การตรวจจับ
export interface DetectionEvent {
  id: number;                    // ID ของ event
  cam_id: string;                // UUID ของกล้อง
  camera: Camera;                // ข้อมูลกล้อง
  timestamp: string;             // เวลาที่ตรวจจับ (ISO 8601)
  image_path: string;            // path รูปภาพ เช่น "/api/files/..."
  objects: DetectedObject[];     // รายการวัตถุที่ตรวจจับได้
}

// Response จาก API
export interface DetectionResponse {
  success: boolean;              // สถานะความสำเร็จ
  data: DetectionEvent[];        // รายการ detection events
}
