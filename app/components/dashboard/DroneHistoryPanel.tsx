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

  // ✅ ดึงข้อมูลย้อนหลังจาก backend (ยังไม่ได้ทำ API)
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        // TODO: เรียก API เพื่อดึงข้อมูลย้อนหลัง
        // const response = await fetch(`/api/drones/${droneId}/history`);
        // const data = await response.json();
        // setHistoryData(data);
        
        // ✅ Mock data สำหรับทดสอบ
        const mockData: DroneHistoryData[] = [
          { timestamp: '12:00', lat: 13.73, lng: 100.52, alt: 20000 },
          { timestamp: '12:30', lat: 13.74, lng: 100.53, alt: 21000 },
          { timestamp: '13:00', lat: 13.75, lng: 100.54, alt: 15000 },
          { timestamp: '13:30', lat: 13.76, lng: 100.55, alt: 10000 },
          { timestamp: '14:00', lat: 13.77, lng: 100.56, alt: 12500 },
          { timestamp: '14:30', lat: 13.78, lng: 100.57, alt: 9000 },
          { timestamp: '15:00', lat: 13.79, lng: 100.58, alt: 15500 },
          { timestamp: '15:30', lat: 13.80, lng: 100.59, alt: 17500 },
          { timestamp: '16:00', lat: 13.81, lng: 100.60, alt: 16000 },
          { timestamp: '12:00', lat: 13.73, lng: 100.52, alt: 20000 },
          { timestamp: '12:30', lat: 13.74, lng: 100.53, alt: 21000 },
          { timestamp: '13:00', lat: 13.75, lng: 100.54, alt: 15000 },
          { timestamp: '13:30', lat: 13.76, lng: 100.55, alt: 10000 },
          { timestamp: '14:00', lat: 13.77, lng: 100.56, alt: 12500 },
          { timestamp: '14:30', lat: 13.78, lng: 100.57, alt: 9000 },
          { timestamp: '15:00', lat: 13.79, lng: 100.58, alt: 15500 },
          { timestamp: '15:30', lat: 13.80, lng: 100.59, alt: 17500 },
          { timestamp: '16:00', lat: 13.81, lng: 100.60, alt: 16000 },
          
        ];
        setHistoryData(mockData);
      } catch (error) {
        console.error('Error fetching drone history:', error);
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
                      {historyData.map((data, index) => (
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
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
