import React from 'react';
import { Booking } from '../type';
import { formatCurrency, formatStatus } from '../utils';
import { FaCalendarAlt } from 'react-icons/fa';

interface BookingsTableProps {
  filteredBookings: Booking[];
  setSelectedBooking: (booking: Booking) => void;
  activeTabLabel: string;
}

export default function BookingsTable({ filteredBookings, setSelectedBooking, activeTabLabel }: BookingsTableProps) {
  return (
    <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-100">
      
      {/* Table Header Row (matches image) */}
      <div className="p-6 flex justify-between items-center border-b border-gray-100 bg-white">
        <h3 className="text-lg font-extrabold text-blue-900 uppercase">
          {activeTabLabel}
        </h3>
        {/* Dummy Date Pickers for Visual Match */}
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
          <span>FROM</span>
          <span className="flex items-center gap-2 bg-white px-2 py-1 rounded border">dd/mm/yyyy <FaCalendarAlt/></span>
          <span>TO</span>
          <span className="flex items-center gap-2 bg-white px-2 py-1 rounded border">dd/mm/yyyy <FaCalendarAlt/></span>
        </div>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-white border-b border-gray-200 text-xs font-bold uppercase text-blue-900">
            <th className="p-6">Date & Time</th>
            <th className="p-6 text-center">No. of Pets</th>
            <th className="p-6">Service to Avail</th>
            <th className="p-6">Total Amt</th>
            <th className="p-6 text-center">Status</th>
            <th className="p-6 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredBookings.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">
                No bookings found for this category.
              </td>
            </tr>
          ) : (
            filteredBookings.map((booking) => {
              // Extract pets count and service names safely
              const petCount = booking.booking_pet_info?.length || 0;
              const services = booking.booking_pet_info
                ?.flatMap(pet => pet.booking_service_info?.map(s => s.booking_service_name))
                .filter(Boolean)
                .join(', ') || 'N/A';

              return (
                <tr key={booking.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="p-6 font-bold text-blue-900">
                    {booking.booking_date} <br/>
                    <span className="text-gray-500 font-normal text-sm">{booking.booking_timeslot}</span>
                  </td>
                  <td className="p-6 font-bold text-blue-900 text-center">{petCount}</td>
                  <td className="p-6 text-blue-900 text-sm max-w-[200px] truncate">{services}</td>
                  <td className="p-6 font-bold text-blue-900">{formatCurrency(booking.booking_total_amount)}</td>
                  <td className="p-6 text-center">
                    <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase bg-blue-50 text-blue-900 border border-blue-100">
                      {formatStatus(booking.booking_status)}
                    </span>
                  </td>
                  <td className="p-6 text-center">
                    <button
                      onClick={() => setSelectedBooking(booking)}
                      className="px-4 py-2 text-sm border-2 border-blue-900 text-blue-900 font-bold rounded-xl hover:bg-blue-900 hover:text-white transition w-full"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}