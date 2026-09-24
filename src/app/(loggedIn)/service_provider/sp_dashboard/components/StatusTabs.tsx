import React from 'react';
import { Booking, BookingStatus } from '../type';

interface StatusTabsProps {
  bookings: Booking[];
  activeTab: BookingStatus | 'all';
  setActiveTab: (tab: BookingStatus | 'all') => void;
}

// Grouped tabs for the UI cards based on your image and schema
const TAB_CARDS: { label: string; value: BookingStatus | 'all'; countFilter: BookingStatus[] }[] = [
  { label: 'New Requests', value: 'pending_sp_response', countFilter: ['pending_sp_response'] },
  { label: 'Verify Payment', value: 'approved', countFilter: ['approved'] },
  { label: 'Upcoming', value: 'paid', countFilter: ['paid'] },
  { label: 'Completed', value: 'rated', countFilter: ['to_rate', 'rated'] },
  { label: 'Cancelled', value: 'cancelled', countFilter: ['rejected', 'cancelled'] },
];

export default function StatusTabs({ bookings, activeTab, setActiveTab }: StatusTabsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {TAB_CARDS.map((tab) => {
        // Count bookings that match the grouped statuses
        const count = bookings.filter(b => tab.countFilter.includes(b.booking_status)).length;
        const isActive = activeTab === tab.value;

        return (
          <div
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`p-6 rounded-2xl text-center cursor-pointer transition-all duration-200 border-2 shadow-sm flex flex-col justify-center
              ${isActive 
                ? 'border-yellow-400 bg-yellow-50' 
                : 'border-transparent bg-white hover:-translate-y-1 hover:shadow-md'
              }`}
          >
            <h3 className="text-sm font-bold text-blue-900 mb-2">{tab.label}</h3>
            <p className={`text-4xl font-extrabold ${tab.value === 'cancelled' && !isActive ? 'text-red-500' : 'text-blue-900'}`}>
              {count}
            </p>
          </div>
        );
      })}
    </div>
  );
}