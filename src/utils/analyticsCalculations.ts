export function processBusinessPerformanceData(bookings: any[], pets: any[], services: any[]) {
  console.log("🛠️ Processing Bookings inside Calculator:", bookings);

  // 1. Initialize days of the week (Mon-Sun)
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dogPeakDays = new Array(7).fill(0);
  const catPeakDays = new Array(7).fill(0);

  // 2. Initialize time slots for Booked Hours
  const timeLabels = ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM', '6:00 PM'];
  const dogHours = new Array(timeLabels.length).fill(0);
  const catHours = new Array(timeLabels.length).fill(0);

  // 3. Process the 12 real bookings
  if (bookings && bookings.length > 0) {
    bookings.forEach(booking => {
      // Parse booking date (from your schema: booking_date)
      const dateStr = booking.booking_date;
      if (!dateStr) return;
      
      const bookingDate = new Date(dateStr);
      const dayIndex = (bookingDate.getDay() + 6) % 7; // Convert Sun(0)-Sat(6) to Mon(0)-Sun(6)

      // Find pets tied to this booking
      const bookingPets = pets.filter(p => p.booking_info_id === booking.id);
      let isCat = false;

      if (bookingPets.length > 0) {
        bookingPets.forEach(pet => {
          if (pet.pet_type?.toLowerCase() === 'cat' || pet.species?.toLowerCase() === 'cat') {
            isCat = true;
          }
        });
      }

      // Tally Peak Days
      if (isCat) {
        catPeakDays[dayIndex]++;
      } else {
        dogPeakDays[dayIndex]++; // Defaulting unassigned/dogs to dog column
      }

      // Parse timeslot (from your schema: booking_timeslot, e.g., "12:00 PM" or "11:00 AM - 01:00 PM")
      const timeslot = booking.booking_timeslot || '';
      if (timeslot.includes('10')) {
        isCat ? catHours[1]++ : dogHours[1]++;
      } else if (timeslot.includes('12')) {
        isCat ? catHours[2]++ : dogHours[2]++;
      } else if (timeslot.includes('02') || timeslot.includes('2:')) {
        isCat ? catHours[3]++ : dogHours[3]++;
      } else if (timeslot.includes('04') || timeslot.includes('4:')) {
        isCat ? catHours[4]++ : dogHours[4]++;
      } else if (timeslot.includes('06') || timeslot.includes('6:')) {
        isCat ? catHours[5]++ : dogHours[5]++;
      } else {
        isCat ? catHours[0]++ : dogHours[0]++; // Default to 8:00 AM bucket
      }
    });
  }

  // 4. Calculate Service Breakdown for Sidebar
  const serviceCounts: { [key: string]: number } = {};
  let totalServices = 0;

  if (services && services.length > 0) {
    services.forEach(srv => {
      const name = srv.booking_service_name || 'General Service';
      serviceCounts[name] = (serviceCounts[name] || 0) + 1;
      totalServices++;
    });
  }

  const serviceBreakdown = totalServices > 0 
    ? Object.keys(serviceCounts).map(name => ({
        name,
        bookings: serviceCounts[name],
        percentage: Math.round((serviceCounts[name] / totalServices) * 100)
      }))
    : [
        { name: 'Pooch Package', bookings: 0, percentage: 0 },
        { name: 'Nail Clipping', bookings: 0, percentage: 0 },
        { name: 'Ear Cleaning', bookings: 0, percentage: 0 }
      ];

  // Find busiest hour dynamically
  const combinedHours = timeLabels.map((_, i) => dogHours[i] + catHours[i]);
  const maxHourIdx = combinedHours.indexOf(Math.max(...combinedHours));
  const busiestHour = Math.max(...combinedHours) > 0 ? timeLabels[maxHourIdx] : '10:00 AM';

  return {
    bookingsByDay: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      dogValues: [
        dogPeakDays[0] + dogPeakDays[1],
        dogPeakDays[2] + dogPeakDays[3],
        dogPeakDays[4],
        dogPeakDays[5] + dogPeakDays[6]
      ],
      catValues: [
        catPeakDays[0] + catPeakDays[1],
        catPeakDays[2] + catPeakDays[3],
        catPeakDays[4],
        catPeakDays[5] + catPeakDays[6]
      ]
    },
    peakDays: {
      labels: daysOfWeek,
      dogValues: dogPeakDays,
      catValues: catPeakDays
    },
    bookedHours: {
      timeLabels,
      dogValues: dogHours,
      catValues: catHours,
      busiestHour
    },
    serviceBreakdown
  };
}