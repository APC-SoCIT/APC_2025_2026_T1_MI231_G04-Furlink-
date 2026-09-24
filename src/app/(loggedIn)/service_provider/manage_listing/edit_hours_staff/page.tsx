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
        if (!user) return;

        const { data: generalData } = await supabase
          .from('sp_general_info')
          .select('id')
          .eq('profiles_id', user.id)
          .single();

        if (generalData) {
          setSpId(generalData.id);

          const [hoursRes, staffRes] = await Promise.all([
            supabase.from('sp_operating_hours').select('*').eq('sp_id', generalData.id),
            supabase.from('sp_employees_info').select('*').eq('sp_id', generalData.id)
          ]);

          setHours(hoursRes.data || []);
          setStaff(staffRes.data || []);
        }
      } catch (err: any) {
        setErrorMessage("Failed to load hours and staff.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  // Handlers for Hours
  const handleHourChange = (index: number, field: string, value: any) => {
    const updated = [...hours];
    updated[index][field] = value;
    setHours(updated);
  };

  // Handlers for Staff
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

  // Submit Logic
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (!spId) throw new Error("Provider ID not found.");

      // Clean payloads (remove DB-generated IDs and timestamps)
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

      // 1. Delete existing records
      await Promise.all([
        supabase.from('sp_operating_hours').delete().eq('sp_id', spId),
        supabase.from('sp_employees_info').delete().eq('sp_id', spId)
      ]);

      // 2. Insert new records
      if (hoursPayload.length > 0) {
        const { error } = await supabase.from('sp_operating_hours').insert(hoursPayload);
        if (error) throw error;
      }

      if (staffPayload.length > 0) {
        const { error } = await supabase.from('sp_employees_info').insert(staffPayload);
        if (error) throw error;
      }

      router.push("/service_provider/manage_listing");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update hours and staff.");
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
              <h3 style={{ color: '#0a217a', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>Operating Hours</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {hours.map((h, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fdfdfd', padding: '10px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <div style={{ width: '120px', fontWeight: 'bold', textTransform: 'capitalize', color: '#333' }}>
                      {h.day_of_week}
                    </div>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <input type="time" value={h.opening_time} onChange={(e) => handleHourChange(index, 'opening_time', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                      <span>to</span>
                      <input type="time" value={h.closing_time} onChange={(e) => handleHourChange(index, 'closing_time', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                    </div>
                    <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto' }}>
                      <input type="number" placeholder="Mins" value={h.slot_interval} onChange={(e) => handleHourChange(index, 'slot_interval', e.target.value)} style={{ width: '70px', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                      <input type="number" placeholder="Capacity" value={h.slot_capacity} onChange={(e) => handleHourChange(index, 'slot_capacity', e.target.value)} style={{ width: '70px', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                    </div>
                  </div>
                ))}
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
                  <div key={index} style={{ display: 'flex', gap: '10px', background: '#fdfdfd', padding: '15px', borderRadius: '8px', border: '1px solid #e0e0e0', position: 'relative' }}>
                    <div className="listing-field-group" style={{ flex: 1, padding: 0, border: 'none' }}>
                      <label style={{ marginBottom: '4px' }}>First Name</label>
                      <input type="text" value={s.employee_first_name} onChange={(e) => handleStaffChange(index, 'employee_first_name', e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    </div>
                    <div className="listing-field-group" style={{ flex: 1, padding: 0, border: 'none' }}>
                      <label style={{ marginBottom: '4px' }}>Last Name</label>
                      <input type="text" value={s.employee_last_name} onChange={(e) => handleStaffChange(index, 'employee_last_name', e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    </div>
                    <div className="listing-field-group" style={{ flex: 1, padding: 0, border: 'none' }}>
                      <label style={{ marginBottom: '4px' }}>Position</label>
                      <input type="text" value={s.employee_position} onChange={(e) => handleStaffChange(index, 'employee_position', e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    </div>
                    <button type="button" onClick={() => removeStaff(index)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: '#d9534f', fontSize: '18px', cursor: 'pointer' }}>&times;</button>
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