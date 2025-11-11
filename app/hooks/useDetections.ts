/**
 * Custom hook สำหรับดึงข้อมูลการตรวจจับล่าสุดจาก API
 * ใช้ React Query สำหรับจัดการ caching และ refetching
 */

import { useQuery } from '@tanstack/react-query';
import { getRecentDetections } from '@/app/api/detection';

export const useDetections = (camId: string, token: string, enabled: boolean) => {
  return useQuery({
    // unique key สำหรับ cache เมื่อ camId เปลี่ยน จะถือว่าเป็น query ใหม่
    queryKey: ['detections', camId],

    // ฟังก์ชันที่จะเรียก API
    queryFn: () => getRecentDetections(camId, token),

    // เปิด/ปิดการ query ถ้า enabled = false จะไม่เรียก API
    enabled: enabled && !!camId && !!token,

    // refetch ทุกๆ 30 วินาที
    refetchInterval: 30000,
  });
};
