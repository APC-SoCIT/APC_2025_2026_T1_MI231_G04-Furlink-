import React from 'react';
import { Booking, BookingStatus } from '../type';
import { formatCurrency, formatStatus } from '../utils';

interface BookingDetailsModalProps {
  selectedBooking: Booking;
  setSelectedBooking: (booking: Booking | null) => void;
  handleUpdateStatus: (id: string, newStatus: BookingStatus, reason?: string) => void;
}

export default function BookingDetailsModal({ 
  selectedBooking, 
  setSelectedBooking, 
  handleUpdateStatus 
}: BookingDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 border-b border-slate-800 pb-2">Booking Details</h3>
        
        {/* Basic Booking Info */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <p><strong>Date & Time:</strong> {selectedBooking.booking_date} ({selectedBooking.booking_timeslot})</p>
          <p><strong>Total Amount:</strong> {formatCurrency(selectedBooking.booking_total_amount)}</p>
          <p><strong>Status:</strong> <span className="capitalize">{formatStatus(selectedBooking.booking_status)}</span></p>
          <p><strong>Created At:</strong> {new Date(selectedBooking.created_at).toLocaleString()}</p>
        </div>

        {/* Pets & Services Section */}
        <div className="mb-6">
          <h4 className="text-md font-semibold text-blue-400 mb-2">Pet(s) & Services</h4>
          {selectedBooking.booking_pet_info && selectedBooking.booking_pet_info.length > 0 ? (
            selectedBooking.booking_pet_info.map((pet) => (
              <div key={pet.id} className="bg-slate-800 p-4 rounded-lg mb-3 border border-slate-700 text-sm">
                <p className="font-bold text-base text-yellow-400 mb-1">{pet.booking_pet_name} ({pet.booking_pet_type})</p>
                <div className="grid grid-cols-2 gap-2 text-gray-300 mb-2">
                  <p><strong>Breed:</strong> {pet.booking_breed}</p>
                  <p><strong>Gender:</strong> {pet.booking_gender}</p>
                  <p><strong>Weight:</strong> {pet.booking_weight} kg ({pet.booking_calculated_size})</p>
                  <p><strong>Behavior:</strong> {pet.booking_behavior?.join(', ') || 'N/A'}</p>
                </div>
                
                {/* Nested Services List */}
                {pet.booking_service_info && pet.booking_service_info.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <p className="font-semibold text-xs text-gray-400 uppercase mb-1">Services:</p>
                    <ul className="list-disc list-inside text-gray-200">
                      {pet.booking_service_info.map((srv) => (
                        <li key={srv.id}>
                          {srv.booking_service_name} - {formatCurrency(srv.booking_price)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm">No pet info attached.</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 border-t border-slate-800 pt-4">
          {selectedBooking.booking_status === 'pending_sp_response' && (
            <>
              <button
                onClick={() => handleUpdateStatus(selectedBooking.id, 'rejected', 'Schedule Conflict')}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 font-semibold"
              >
                Reject Booking
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedBooking.id, 'approved')}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 font-semibold"
              >
                Approve Booking
              </button>
            </>
          )}
          <button
            onClick={() => setSelectedBooking(null)}
            className="px-4 py-2 bg-slate-700 text-white text-sm rounded hover:bg-slate-600 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}