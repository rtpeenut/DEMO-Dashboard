/**
 * API functions สำหรับดึงข้อมูลการตรวจจับ
 */

import axiosInstance from './axios';
import { type DetectionResponse } from '../types/detection';

// ดึงข้อมูลการตรวจจับล่าสุดจากกล้อง
// URL: GET /object-detection/{camId}
export const getRecentDetections = async (
  camId: string,
  token: string
): Promise<DetectionResponse> => {
  const response = await axiosInstance.get(`/object-detection/${camId}`, {
    headers: {
      'x-camera-token': token,  // Authentication token
    },
  });

  return response.data;
};
