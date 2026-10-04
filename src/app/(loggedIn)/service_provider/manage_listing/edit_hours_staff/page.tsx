/* src/app/(loggedIn)/service_provider/manage_listing/edit_hours_staff/page.tsx */
'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Footer from "@/components/Footer";
import "../manage_listing.css";

export default function EditHoursStaffPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [spId, setSpId] = useState<string | null>(null);
  const [hours, setHours] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required.");

        const { data: generalData, error: generalError } = await supabase
          .from('sp_general_info')
          .select('id')
          .eq('profiles_id', user.id)
          .single();

        if (generalError || !generalData) {
          throw new Error("Could not fetch provider profile.");
        }

        setSpId(generalData.id);

        const [hoursRes, staffRes] = await Promise.all([
          supabase.from('sp_operating_hours').select('*').eq('sp_id', generalData.id),
          supabase.from('sp_employees_info').select('*').eq('sp_id', generalData.id)
        ]);

        if (hoursRes.error) throw new Error("Failed to load operating hours.");
        if (staffRes.error) throw new Error("Failed to load staff information.");

        setHours(hoursRes.data || []);
        setStaff(staffRes.data || []);
      } catch (err: any) {
        setErrorMessage(err?.message || "An unexpected error occurred while loading data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const handleHourChange = (index: number, field: string, value: any) => {
    const updated = [...hours];
    updated[index][field] = value;
    setHours(updated);
  };

  // 1. Add new operating hour row function
  const addHourRow = () => {
    setHours([...hours, { 
      day_of_week: "Monday", 
      opening_time: "09:00", 
      closing_time: "17:00", 
      slot_interval: 60, 
      slot_capacity: 1 
    }]);
  };

  // 2. Remove operating hour row function
  const removeHourRow = (index: number) => {
    setHours(hours.filter((_, i) => i !== index));
  };

  const handleStaffChange = (index: number, field: string, value: string) => {
    const updated = [...staff];
    updated[index][field] = value;
    setStaff(updated);
  };

  const addStaff = () => {
    setStaff([...staff, { employee_first_name: "", employee_last_name: "", employee_position: "" }]);
  };

  const removeStaff = (index: number) => {
    setStaff(staff.filter((_, i) => i !== index));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (!spId) throw new Error("Provider profile ID is missing. Cannot save changes.");

      const hoursPayload = hours.map(h => ({
        sp_id: spId,
        day_of_week: h.day_of_week,
        opening_time: h.opening_time,
        closing_time: h.closing_time,
        slot_interval: parseInt(h.slot_interval) || 60,
        slot_capacity: parseInt(h.slot_capacity) || 1,
      }));

      const staffPayload = staff.map(s => ({
        sp_id: spId,
        employee_first_name: s.employee_first_name,
        employee_last_name: s.employee_last_name,
        employee_position: s.employee_position,
      }));

      const { error: hoursDelErr } = await supabase.from('sp_operating_hours').delete().eq('sp_id', spId);
      if (hoursDelErr) throw new Error("Failed to overwrite old operating hours.");

      const { error: staffDelErr } = await supabase.from('sp_employees_info').delete().eq('sp_id', spId);
      if (staffDelErr) throw new Error("Failed to overwrite old staff information.");

      if (hoursPayload.length > 0) {
        const { error } = await supabase.from('sp_operating_hours').insert(hoursPayload);
        if (error) throw new Error("Failed to save new operating hours.");
      }

      if (staffPayload.length > 0) {
        const { error } = await supabase.from('sp_employees_info').insert(staffPayload);
        if (error) throw new Error("Failed to save new staff information.");
      }

      router.push("/service_provider/manage_listing");
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred during save.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>Loading data...</div>;

  return (
    <div className="manage-listing-page-layout">
      <div className="manage-listing-container">
        <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          
          <h2 style={{ color: '#0a217a', marginBottom: '20px' }}>Edit Hours & Staff</h2>

          {errorMessage && <div style={{ backgroundColor: '#fce8e6', color: '#c5221f', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{errorMessage}</div>}

          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Hours Section */}
            <div>
              {/* 3. Updated Header with Add Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                <h3 style={{ color: '#0a217a', margin: 0 }}>Operating Hours</h3>
                <button type="button" onClick={addHourRow} style={{ background: '#0a217a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>+ Add Schedule</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {hours.map((h, index) => (
                  // 4. Added relative positioning and adjusted padding for the close button
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#fdfdfd', padding: '25px 15px 15px 15px', borderRadius: '8px', border: '1px solid #e0e0e0', position: 'relative', flexWrap: 'wrap' }}>
                    
                    {/* 5. Converted Day text into a Select Dropdown */}
                    <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
                      <label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', fontWeight: 600, display: 'block' }}>Day</label>
                      <select 
                        value={h.day_of_week} 
                        onChange={(e) => handleHourChange(index, 'day_of_week', e.target.value)} 
                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', width: '100%', textTransform: 'capitalize', background: '#fff' }} 
                        required
                      >
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                      </select>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: '1 1 200px', minWidth: '200px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>Open</label>
                        <input type="time" value={h.opening_time} onChange={(e) => handleHourChange(index, 'opening_time', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', width: '100%' }} required />
                      </div>
                      <span style={{ marginTop: '16px', fontSize: '13px', color: '#555' }}>to</span>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>Close</label>
                        <input type="time" value={h.closing_time} onChange={(e) => handleHourChange(index, 'closing_time', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', width: '100%' }} required />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', flex: '1 1 200px', minWidth: '200px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>Duration (Mins)</label>
                        <input type="number" placeholder="60" value={h.slot_interval} onChange={(e) => handleHourChange(index, 'slot_interval', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', width: '100%' }} required />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>Capacity (Pets/Slot)</label>
                        <input type="number" placeholder="1" value={h.slot_capacity} onChange={(e) => handleHourChange(index, 'slot_capacity', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', width: '100%' }} required />
                      </div>
                    </div>

                    {/* 6. Added Removal Button */}
                    <button type="button" onClick={() => removeHourRow(index)} style={{ position: 'absolute', top: '5px', right: '10px', background: 'transparent', border: 'none', color: '#d9534f', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }} title="Remove Schedule">&times;</button>
                  </div>
                ))}
                {hours.length === 0 && <p style={{ fontSize: '14px', color: '#666' }}>No operating hours added.</p>}
              </div>
            </div>

            {/* Staff Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                <h3 style={{ color: '#0a217a', margin: 0 }}>Registered Staff</h3>
                <button type="button" onClick={addStaff} style={{ background: '#0a217a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>+ Add Staff</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {staff.map((s, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', background: '#fdfdfd', padding: '25px 15px 15px 15px', borderRadius: '8px', border: '1px solid #e0e0e0', position: 'relative', flexWrap: 'wrap' }}>
                    <div className="listing-field-group" style={{ flex: '1 1 150px', padding: 0, border: 'none' }}>
                      <label style={{ marginBottom: '4px' }}>First Name</label>
                      <input type="text" value={s.employee_first_name} onChange={(e) => handleStaffChange(index, 'employee_first_name', e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: '100%' }} />
                    </div>
                    <div className="listing-field-group" style={{ flex: '1 1 150px', padding: 0, border: 'none' }}>
                      <label style={{ marginBottom: '4px' }}>Last Name</label>
                      <input type="text" value={s.employee_last_name} onChange={(e) => handleStaffChange(index, 'employee_last_name', e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: '100%' }} />
                    </div>
                    <div className="listing-field-group" style={{ flex: '1 1 150px', padding: 0, border: 'none' }}>
                      <label style={{ marginBottom: '4px' }}>Position</label>
                      <select 
                        value={s.employee_position} 
                        onChange={(e) => handleStaffChange(index, 'employee_position', e.target.value)} 
                        required 
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', width: '100%' }}
                      >
                        <option value="" disabled>Select Position</option>
                        <option value="pet_stylist">Pet Stylist</option>
                        <option value="business_owner">Business Owner</option>
                        <option value="staff">Staff</option>
                      </select>
                    </div>
                    <button type="button" onClick={() => removeStaff(index)} style={{ position: 'absolute', top: '5px', right: '10px', background: 'transparent', border: 'none', color: '#d9534f', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }} title="Remove Staff">&times;</button>
                  </div>
                ))}
                {staff.length === 0 && <p style={{ fontSize: '14px', color: '#666' }}>No staff members added.</p>}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => router.push("/service_provider/manage_listing")} style={{ background: '#e0ded6', color: '#333', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={isSaving} style={{ background: '#0a217a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{isSaving ? "Saving..." : "Save Changes"}</button>
            </div>
          </form>

        </div>
      </div>
      <Footer />
    </div>
  );
}