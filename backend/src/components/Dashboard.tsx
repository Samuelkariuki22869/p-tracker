import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../api';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement);

interface DashboardStats {
  averageGrade: number;
  attendanceRate: number;
  topPerformers: Array<{ name: string; average: number }>;
  subjectBreakdown: Array<{ name: string; average: number }>;
}

const Dashboard: React.FC = () => {
  const { data, error, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats,
  });

  if (isLoading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error loading dashboard</div>;

  const subjectChartData = {
    labels: data?.subjectBreakdown.map(s => s.name) || [],
    datasets: [{
      label: 'Average Grade',
      data: data?.subjectBreakdown.map(s => s.average) || [],
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
    }],
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
        
        {/* Key Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Average Grade</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{data?.averageGrade.toFixed(1)}%</p>
            <p className="text-sm text-green-600 mt-1">↑ 12% from last month</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Attendance Rate</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{data?.attendanceRate.toFixed(1)}%</p>
            <p className="text-sm text-green-600 mt-1">↑ 3% from last month</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Top Performer</h3>
            <p className="text-2xl font-bold text-purple-600 mt-2">{data?.topPerformers[0]?.name}</p>
            <p className="text-sm text-gray-600 mt-1">{data?.topPerformers[0]?.average.toFixed(1)}% average</p>
          </div>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Subject</h3>
            <Bar 
              data={subjectChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: { beginAtZero: true, max: 100 },
                },
              }}
            />
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
            <div className="space-y-3">
              {data?.topPerformers.map((performer, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">{performer.name}</span>
                  <span className="text-blue-600 font-bold">{performer.average.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Low Performance Alerts */}
        {data?.lowPerformers.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-4">⚠️ Low Performance Alerts</h3>
            <div className="space-y-2">
              {data?.lowPerformers.map((student, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded">
                  <span className="text-red-900">{student.name}</span>
                  <span className="text-red-600 font-bold">{student.average.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;