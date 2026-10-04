export function processBusinessPerformanceData(
  bookings: any[], 
  pets: any[], 
  services: any[],
  timeFilter: 'weekly' | 'monthly' | 'yearly' | 'custom' = 'monthly' // Add timeframe parameter
) {
  console.log("🛠️ Processing Bookings inside Calculator:", bookings);

  // 1. Initialize days of the week (Mon-Sun)
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dogPeakDays = new Array(7).fill(0);
  const catPeakDays = new Array(7).fill(0);

  // 2. Initialize time slots for Booked Hours
  const timeLabels = ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM', '6:00 PM'];
  const dogHours = new Array(timeLabels.length).fill(0);
  const catHours = new Array(timeLabels.length).fill(0);

  // 3. Initialize Arrays for the Average Bookings Top Chart (Monthly vs Yearly)
  let topChartLabels: string[] = [];
  let dogTopChart = [];
  let catTopChart = [];

  if (timeFilter === 'yearly') {
    topChartLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    dogTopChart = new Array(12).fill(0);
    catTopChart = new Array(12).fill(0);
  } else {
    topChartLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
    dogTopChart = new Array(5).fill(0);
    catTopChart = new Array(5).fill(0);
  }

  // 4. Process the real bookings
  if (bookings && bookings.length > 0) {
    bookings.forEach(booking => {
      const dateStr = booking.booking_date;
      if (!dateStr) return;
      
      const bookingDate = new Date(dateStr);
      const dayIndex = (bookingDate.getDay() + 6) % 7; // Convert Sun(0)-Sat(6) to Mon(0)-Sun(6)
      const monthIndex = bookingDate.getMonth();
      const weekIndex = Math.min(Math.floor(bookingDate.getDate() / 7), 4); // Buckets into week 1-5

      // Find pets tied to this booking
      const bookingPets = pets.filter(p => p.booking_info_id === booking.id);
      let isCat = false;

      if (bookingPets.length > 0) {
        bookingPets.forEach(pet => {
          // FIX: Updated to match Supabase schema for pet type recognition
          if (pet.booking_pet_type?.toLowerCase() === 'cat' || pet.pet_type?.toLowerCase() === 'cat' || pet.species?.toLowerCase() === 'cat') {
            isCat = true;
          }
        });
      }

      // Tally Average Bookings Top Chart
      if (timeFilter === 'yearly') {
        isCat ? catTopChart[monthIndex]++ : dogTopChart[monthIndex]++;
      } else {
        isCat ? catTopChart[weekIndex]++ : dogTopChart[weekIndex]++;
      }

      // Tally Peak Days
      if (isCat) {
        catPeakDays[dayIndex]++;
      } else {
        dogPeakDays[dayIndex]++;
      }

      // Tally Booked Hours
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
        isCat ? catHours[0]++ : dogHours[0]++;
      }
    });
  }

  // Find busiest hour dynamically
  const combinedHours = timeLabels.map((_, i) => dogHours[i] + catHours[i]);
  const maxHourIdx = combinedHours.indexOf(Math.max(...combinedHours));
  const busiestHour = Math.max(...combinedHours) > 0 ? timeLabels[maxHourIdx] : '10:00 AM';

  return {
    bookingsByDay: {
      labels: topChartLabels,
      dogValues: dogTopChart,
      catValues: catTopChart
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
    }
  };
}