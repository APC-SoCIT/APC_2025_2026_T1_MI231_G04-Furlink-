import React, { useMemo } from 'react';
import PetSizeChart from './components/PetSizeChart';
import PetTypeChart from './components/PetTypeChart';
import CustomerTypeChart from './components/CustomerTypeChart';
import TopCustomersChart from './components/TopCustomersChart';
import DogBreedsChart from './components/DogBreedsChart';
import styles from '../../business-dashboard.module.css';

interface CustomerInsightsProps {
  timeFilter: 'weekly' | 'monthly' | 'yearly' | 'custom';
  petTypeFilter: 'all' | 'dog' | 'cat';
  bookings: any[];
  pets: any[];
}

export default function CustomerInsights({ timeFilter, petTypeFilter, bookings, pets }: CustomerInsightsProps) {
  
  const analyticsData = useMemo(() => {
    const bookingIds = new Set(bookings.map(b => b.id));
    const validPets = pets.filter(p => bookingIds.has(p.booking_info_id));

    // 1. Pet Size Aggregation using booking_calculated_size
    const sizeMap: { [key: string]: number } = { 'Small': 0, 'Medium': 0, 'Large': 0, 'Extra Large': 0 };
    validPets.forEach(p => {
      const size = String(p.booking_calculated_size || p.pet_size || p.size || '').toLowerCase().trim();
      
      if (size === 'extra large' || size === 'xl' || size.includes('extra')) sizeMap['Extra Large']++;
      else if (size === 'large' || size.includes('large')) sizeMap['Large']++;
      else if (size === 'medium' || size.includes('medium')) sizeMap['Medium']++;
      else if (size === 'small' || size.includes('small')) sizeMap['Small']++;
    });

    // 2. Pet Type Aggregation
    let dogCount = 0;
    let catCount = 0;
    validPets.forEach(p => {
      const type = String(p.pet_type || p.species || '').toLowerCase();
      if (type.includes('cat')) catCount++;
      else dogCount++;
    });

    // 3. Customer Type & Top Rebooked Customers
    const customerMap: { [key: string]: number } = {};
    bookings.forEach(b => {
      const p = b.profiles;
      const customerName = p?.username 
        || (p?.first_name && p?.last_name ? `${p.first_name} ${p.last_name}` : null) 
        || p?.first_name 
        || `Customer ${b.profiles_id?.substring(0, 4) || b.id?.substring(0, 4)}`;
        
      customerMap[customerName] = (customerMap[customerName] || 0) + 1;
    });

    let newCount = 0;
    let returningCount = 0;
    const customerList = Object.keys(customerMap).map(name => {
      const count = customerMap[name];
      if (count > 1) returningCount++;
      else newCount++;
      return { name, count };
    });

    const topCustomers = customerList
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 4. Breeds Aggregation (Accurately detecting cats via type or breed name)
    const breedMap: { [key: string]: { count: number; isCat: boolean } } = {};
    validPets.forEach(p => {
      const type = String(p.pet_type || p.species || '').toLowerCase();
      const breed = String(p.booking_breed || p.pet_breed || p.breed || 'Unknown Breed').trim();
      
      // Explicitly catch known cat breeds or type fields
      const isCat = type.includes('cat') || breed.toLowerCase().includes('maine coon') || breed.toLowerCase().includes('persian') || breed.toLowerCase().includes('siamese');
      
      if (!breedMap[breed]) {
        breedMap[breed] = { count: 0, isCat };
      }
      breedMap[breed].count += 1;
    });

    const sortedBreeds = Object.keys(breedMap)
      .map(breed => ({
        breed,
        count: breedMap[breed].count,
        isCat: breedMap[breed].isCat
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 breeds

    // Map into separate arrays for multi-dataset chart support (Enables native clickable legend)
    const breedLabels = sortedBreeds.length > 0 ? sortedBreeds.map(b => b.breed) : ['No Data'];
    const dogValues = sortedBreeds.map(b => !b.isCat ? b.count : 0);
    const catValues = sortedBreeds.map(b => b.isCat ? b.count : 0);

    return {
      petSize: {
        labels: ['Small', 'Medium', 'Large', 'Extra Large'],
        values: [sizeMap['Small'], sizeMap['Medium'], sizeMap['Large'], sizeMap['Extra Large']]
      },
      petType: {
        labels: ['Dogs', 'Cats'],
        values: [dogCount, catCount]
      },
      customerType: {
        labels: ['New', 'Returning'],
        values: [newCount, returningCount]
      },
      topCustomers: topCustomers.length > 0 ? topCustomers : [{ name: 'No Data', count: 0 }],
      breedsData: {
        labels: breedLabels,
        dogValues,
        catValues
      }
    };
  }, [bookings, pets]);

  return (
    <div>
      {/* Top Row: Pet Size, Pet Type, Customer Type */}
      <div className={styles.chartsSection} style={{ gridTemplateColumns: '1.5fr 1fr 1fr' }}>
        <PetSizeChart 
          labels={analyticsData.petSize.labels}
          values={analyticsData.petSize.values}
        />

        <PetTypeChart 
          labels={analyticsData.petType.labels}
          values={analyticsData.petType.values}
          colors={['#1e3a8a', '#facc15']}
        />

        <CustomerTypeChart 
          labels={analyticsData.customerType.labels}
          values={analyticsData.customerType.values}
          colors={['#1e3a8a', '#60a5fa']}
        />
      </div>

      {/* Bottom Row: Top Customers, Most Booked Breeds */}
      <div className={styles.chartsSection} style={{ gridTemplateColumns: '1fr 1fr' }}>
        <TopCustomersChart 
          customers={analyticsData.topCustomers}
        />

        <DogBreedsChart 
          labels={analyticsData.breedsData.labels}
          dogValues={analyticsData.breedsData.dogValues}
          catValues={analyticsData.breedsData.catValues}
        />
      </div>
    </div>
  );
}