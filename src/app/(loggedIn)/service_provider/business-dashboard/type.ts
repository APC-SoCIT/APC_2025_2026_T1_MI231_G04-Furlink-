// Types for Business Dashboard
export type DashboardTab = 'business_performance' | 'sales' | 'customer_insights';
export type TimeFilter = 'weekly' | 'monthly' | 'yearly' | 'custom';
export interface MetricCard {
  label: string;
  value: string | number;
  trend: number; // percentage
  trendDirection: 'up' | 'down' | 'neutral';
  icon?: string;
}

export interface SalesData {
  date: string;
  revenue: number;
  bookings: number;
}

export interface CustomerMetric {
  customerId: string;
  name: string;
  totalSpent: number;
  bookingCount: number;
  rating: number;
  lastBooking: string;
}

export interface ServicePerformance {
  serviceName: string;
  bookingCount: number;
  revenue: number;
  percentage: number;
}

export interface PetTypeBreakdown {
  type: 'dog' | 'cat';
  count: number;
  revenue: number;
  percentage: number;
}

export interface DashboardAnalytics {
  totalRevenue: number;
  totalBookings: number;
  averageBookingValue: number;
  cancellationRate: number;
  listingViews: number;
  averageRating: number;
  peakHour: string;
  topService: string;
}