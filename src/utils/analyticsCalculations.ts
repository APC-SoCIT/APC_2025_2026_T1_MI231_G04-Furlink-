export function processBusinessPerformanceData(bookings: any[] = [], pets: any[] = [], services: any[] = []) {
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safePets = Array.isArray(pets) ? pets : [];
  const safeServices = Array.isArray(services) ? services : [];

  // Filter for approved/valid bookings (adjust status array if 'paid' or others should count)
  const approvedStatuses = ['approved', 'paid', 'to_rate', 'rated'];
  const validBookings = safeBookings.filter((b) => approvedStatuses.includes(b.booking_status));

  // 1. Bookings by Day (Mon-Sun)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dogDayCounts = [0, 0, 0, 0, 0, 0, 0];
  const catDayCounts = [0, 0, 0, 0, 0, 0, 0];

  const dayIndexMap: { [key: number]: number } = {
    1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6,
  };

  validBookings.forEach((booking) => {
    const bookingDate = new Date(booking.booking_date);
    const dayOfWeek = bookingDate.getDay();
    const targetIndex = dayIndexMap[dayOfWeek];

    if (targetIndex !== undefined) {
      const bookingPets = safePets.filter((p) => p.booking_info_id === booking.id);
      bookingPets.forEach((pet) => {
        if (pet.booking_pet_type === 'dog') {
          dogDayCounts[targetIndex] += 1;
        } else if (pet.booking_pet_type === 'cat') {
          catDayCounts[targetIndex] += 1;
        }
      });
    }
  });

  // 2. Pet Type Distribution
  const totalDogs = dogDayCounts.reduce((a, b) => a + b, 0);
  const totalCats = catDayCounts.reduce((a, b) => a + b, 0);

  // 3. Service Breakdown Calculation
  const serviceCounts: { [key: string]: number } = {};
  let totalServiceEntries = 0;

  // Map valid booking IDs to filter relevant services
  const validBookingIds = new Set(validBookings.map((b) => b.id));
  const validPetIds = new Set(safePets.filter((p) => validBookingIds.has(p.booking_info_id)).map((p) => p.id));

  safeServices.forEach((service) => {
    if (validPetIds.has(service.booking_pet_info_id)) {
      const name = service.booking_service_name;
      serviceCounts[name] = (serviceCounts[name] || 0) + 1;
      totalServiceEntries += 1;
    }
  });

  const serviceBreakdown = Object.keys(serviceCounts).map((name) => {
    const count = serviceCounts[name];
    const percentage = totalServiceEntries > 0 ? Math.round((count / totalServiceEntries) * 100) : 0;
    return {
      name,
      bookings: count,
      percentage,
    };
  }).sort((a, b) => b.bookings - a.bookings);

  // 4. Booked Hours Calculation
  const timeSlotMap: { [key: string]: { dog: number; cat: number } } = {};
  
  validBookings.forEach((booking) => {
    const slot = booking.booking_timeslot;
    if (!timeSlotMap[slot]) {
      timeSlotMap[slot] = { dog: 0, cat: 0 };
    }

    const bookingPets = safePets.filter((p) => p.booking_info_id === booking.id);
    bookingPets.forEach((pet) => {
      if (pet.booking_pet_type === 'dog') {
        timeSlotMap[slot].dog += 1;
      } else if (pet.booking_pet_type === 'cat') {
        timeSlotMap[slot].cat += 1;
      }
    });
  });

  const timeLabels = Object.keys(timeSlotMap);
  const dogHourValues = timeLabels.map((slot) => timeSlotMap[slot].dog);
  const catHourValues = timeLabels.map((slot) => timeSlotMap[slot].cat);

  let busiestHour = 'N/A';
  let maxBookings = -1;
  timeLabels.forEach((slot) => {
    const totalInSlot = timeSlotMap[slot].dog + timeSlotMap[slot].cat;
    if (totalInSlot > maxBookings) {
      maxBookings = totalInSlot;
      busiestHour = slot;
    }
  });

  return {
    bookingsByDay: {
      labels: days,
      dogValues: dogDayCounts,
      catValues: catDayCounts,
    },
    petTypeDistribution: {
      labels: ['Dogs', 'Cats'],
      values: [totalDogs, totalCats],
    },
    serviceBreakdown,
    bookedHours: {
      timeLabels: timeLabels.length > 0 ? timeLabels : ['9:00 AM'],
      dogValues: dogHourValues.length > 0 ? dogHourValues : [0],
      catValues: catHourValues.length > 0 ? catHourValues : [0],
      busiestHour,
    },
  };
}