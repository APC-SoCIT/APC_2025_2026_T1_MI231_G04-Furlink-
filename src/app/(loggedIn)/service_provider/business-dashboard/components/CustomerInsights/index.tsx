import React, { useMemo } from 'react';
import PetSizeChart from './components/PetSizeChart';
import PetTypeChart from './components/PetTypeChart';
import CustomerTypeChart from './components/CustomerTypeChart';
import TopCustomersChart from './components/TopCustomersChart';
import DogBreedsChart from './components/DogBreedsChart';
import styles from '../../business-dashboard.module.css';

interface CustomerInsightsProps {
  timeFilter: 'weekly' | 'monthly' | 'yearly'|'custom';
  petTypeFilter: 'all' | 'dog' | 'cat';
}

export default function CustomerInsights({ timeFilter, petTypeFilter }: CustomerInsightsProps) {
  // Mock data for Pet Size
  const mockPetSizeData = useMemo(() => ({
    labels: ['Small', 'Medium', 'Large', 'Extra Large'],
    values: [8, 15, 10, 7],
  }), []);

  // Mock data for Pet Type
  const mockPetTypeData = useMemo(() => ({
    labels: ['Dogs', 'Cats'],
    values: [28, 15],
    colors: ['#1e3a8a', '#facc15'],
  }), []);

  // Mock data for Customer Type (New vs Old)
  const mockCustomerTypeData = useMemo(() => ({
    labels: ['New', 'Returning'],
    values: [12, 8],
    colors: ['#1e3a8a', '#60a5fa'],
  }), []);

  // Mock data for Top Rebooked Customers
  const mockTopCustomers = useMemo(() => [
    { name: 'Furbnb account...', count: 3 },
    { name: 'Reina Rei', count: 2 },
    { name: 'Sarah M.', count: 2 },
    { name: 'John Doe', count: 1 },
    { name: 'Maria S.', count: 1 },
  ], []);

  // Mock data for Dog Breeds
  const mockDogBreedsData = useMemo(() => ({
    labels: ['Aspin', 'Shih Tzu', 'Mixed Breed', 'Labrador', 'Poodle'],
    values: [8, 6, 5, 3, 2],
  }), []);

  return (
    <div>
      {/* Top Row: Pet Size, Pet Type, Customer Type */}
      <div className={styles.chartsSection} style={{ gridTemplateColumns: '1.5fr 1fr 1fr' }}>
        <PetSizeChart 
          labels={mockPetSizeData.labels}
          values={mockPetSizeData.values}
        />

        <PetTypeChart 
          labels={mockPetTypeData.labels}
          values={mockPetTypeData.values}
          colors={mockPetTypeData.colors}
        />

        <CustomerTypeChart 
          labels={mockCustomerTypeData.labels}
          values={mockCustomerTypeData.values}
          colors={mockCustomerTypeData.colors}
        />
      </div>

      {/* Bottom Row: Top Customers, Dog Breeds */}
      <div className={styles.chartsSection} style={{ gridTemplateColumns: '1fr 1fr' }}>
        <TopCustomersChart 
          customers={mockTopCustomers}
        />

        <DogBreedsChart 
          labels={mockDogBreedsData.labels}
          values={mockDogBreedsData.values}
        />
      </div>
    </div>
  );
}