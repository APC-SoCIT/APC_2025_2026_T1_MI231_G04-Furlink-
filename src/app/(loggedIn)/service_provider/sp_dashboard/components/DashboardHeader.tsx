import React from 'react';
import { Booking } from '../type';
import { formatCurrency } from '../utils';
import { FaCalendarAlt, FaChartLine } from 'react-icons/fa';

interface DashboardHeaderProps {
  bookings: Booking[];
}

export default function DashboardHeader({ bookings }: DashboardHeaderProps) {
  // Calculate revenue only from paid/completed/rated bookings
  const totalRevenue = bookings
    .filter(b => ['paid', 'to_rate', 'rated'].includes(b.booking_status))
    .reduce((sum, b) => sum + Number(b.booking_total_amount), 0);

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      {/* Revenue Card */}
      <div className="flex-1 bg-white p-6 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-blue-900">Total Revenue</h2>
          <p className="text-sm text-gray-500">For the month of {currentMonth}</p>
        </div>
        <div className="text-3xl font-extrabold text-blue-900">
          {formatCurrency(totalRevenue)}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button className="bg-blue-900 text-white rounded-2xl px-8 py-4 flex flex-col items-center justify-center gap-2 hover:bg-blue-800 transition shadow-sm min-w-[120px]">
          <FaChartLine size={24} />
          <span className="text-sm font-semibold">Dashboard</span>
        </button>
        <button className="bg-blue-900 text-white rounded-2xl px-8 py-4 flex flex-col items-center justify-center gap-2 hover:bg-blue-800 transition shadow-sm min-w-[120px]">
          <FaCalendarAlt size={24} />
          <span className="text-sm font-semibold">Calendar</span>
        </button>
      </div>
    </div>
  );
}