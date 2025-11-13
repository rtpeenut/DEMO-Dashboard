'use client';

import { useEffect, useState } from 'react';
import { X, Drone } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DroneHistoryData {
  timestamp: string;
  lat: number;
  lng: number;
  alt: number;
}

interface DroneHistoryPanelProps {
  droneId: string;
  droneName: string;
  toolbarHeight: number;
  onClose: () => void;
}

export default function DroneHistoryPanel({ droneId, droneName, toolbarHeight, onClose }: DroneHistoryPanelProps) {
  const [historyData, setHistoryData] = useState<DroneHistoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ✅ ดึงข้อมูลย้อนหลังจาก API
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        
        // ✅ เรียก API detection path
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://82.26.104.188:3000';
        const response = await fetch(`${apiUrl}/api/detection/${droneId}/path`, {
          cache: 'no-store',
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Drone history data:', data);
        
        // ✅ แปลงข้อมูลจาก API เป็น format ที่ใช้แสดงผล
        const formattedData: DroneHistoryData[] = data.count.map((item: any) => {
          // แปลง timestamp เป็น readable format
          const date = new Date(item.t);
          const timeStr = date.toLocaleTimeString('th-TH', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          });
          
          return {
            timestamp: timeStr,
            lat: item.lat,
            lng: item.lng,
            alt: item.alt || 0,
          };
        });
        
        setHistoryData(formattedData);
      } catch (error) {
        console.error('Error fetching drone history:', error);
        // ถ้า error ให้แสดงข้อมูลว่าง
        setHistoryData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [droneId]);

  // ✅ เตรียมข้อมูลสำหรับกราฟ
  const chartData = {
    labels: historyData.map(d => d.timestamp),
    datasets: [
      {
        label: 'Altitude (ft)',
        data: historyData.map(d => d.alt),
        borderColor: '#fb923c', // สีส้ม
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#fb923c',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        titleColor: '#fbbf24',
        bodyColor: '#fff',
        borderColor: '#52525b',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(82, 82, 91, 0.3)',
        },
        ticks: {
          color: '#a1a1aa',
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(82, 82, 91, 0.3)',
        },
        ticks: {
          color: '#a1a1aa',
          font: {
            size: 11,
          },
        },
      },
    },
  };

  return (
    <aside
      style={{
        height: toolbarHeight ? `${toolbarHeight}px` : 'auto',
        maxHeight: toolbarHeight ? `${toolbarHeight}px` : '85vh',
        top: '50%',
        transform: 'translateY(-50%)',
      }}
      className="absolute z-[1200] w-full md:w-[500px] max-w-[calc(100vw-2rem)]
                 left-4 md:left-4
                 rounded-2xl p-3 text-white flex flex-col font-prompt ui-card"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-zinc-800/80 border-b border-zinc-700 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700">
              <Drone size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-400">{droneName}</h2>
              <p className="text-xs text-zinc-400">ID: {droneId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-zinc-700 transition"
            aria-label="Close"
          >
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Detection Details Header */}
          <div className="bg-zinc-800 rounded-xl px-3 py-1.5">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
              Detection Details
            </h3>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-zinc-400 text-sm">
              Loading history data...
            </div>
          ) : (
            <>
              {/* Chart */}
              <div className="bg-zinc-800/60 rounded-xl border border-zinc-700 p-4">
                <div className="h-48">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>

              {/* History Data Table */}
              <div className="bg-zinc-800/60 rounded-xl border border-zinc-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-400 uppercase">
                          Time
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-400 uppercase">
                          Lat
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-400 uppercase">
                          Lng
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-400 uppercase">
                          Alt (ft)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700">
                      {historyData
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((data, index) => (
                          <tr key={index} className="hover:bg-zinc-800/40 transition">
                            <td className="px-3 py-2 text-xs text-zinc-300">{data.timestamp}</td>
                            <td className="px-3 py-2 text-xs text-amber-400 font-mono">
                              {data.lat.toFixed(4)}
                            </td>
                            <td className="px-3 py-2 text-xs text-amber-400 font-mono">
                              {data.lng.toFixed(4)}
                            </td>
                            <td className="px-3 py-2 text-xs text-amber-400 font-semibold">
                              {data.alt.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {historyData.length > itemsPerPage && (
                  <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-t border-zinc-700">
                    <div className="text-xs text-zinc-400">
                      แสดง {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, historyData.length)} จาก {historyData.length} รายการ
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-xs rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        ก่อนหน้า
                      </button>
                      <span className="px-3 py-1 text-xs text-zinc-400">
                        {currentPage} / {Math.ceil(historyData.length / itemsPerPage)}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(historyData.length / itemsPerPage), p + 1))}
                        disabled={currentPage === Math.ceil(historyData.length / itemsPerPage)}
                        className="px-3 py-1 text-xs rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        ถัดไป
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
