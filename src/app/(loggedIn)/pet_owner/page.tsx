"use client";

import { useState, useEffect, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Footer from "@/components/Footer";
import { FaSlidersH, FaStore, FaMapMarkerAlt, FaStar, FaTag } from "react-icons/fa";
import "./browse_listing.css";

type FacilityImage = {
  business_facility_images: string;
};

type BookingRating = {
  booking_overall_rating: number | null;
  booking_staff_rating: number | null;
};

type ServiceOption = {
  service_price: number;
};

type ServiceItem = {
  sp_service_options?: ServiceOption[];
};

type ServiceProvider = {
  id: string;
  profiles_id: string;
  business_name: string;
  business_city: string;
  sp_img_facilities?: FacilityImage[];
  booking_info?: BookingRating[];
  sp_services?: ServiceItem[];
};

export default function PetOwnerPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [showFilters, setShowFilters] = useState(false);
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Applied filters state (drives data filtering on screen)
  const [appliedCity, setAppliedCity] = useState("All");
  const [appliedRating, setAppliedRating] = useState("Any");
  const [appliedMinPrice, setAppliedMinPrice] = useState(0);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState(5000);

  // Temporary filter state (inside the dropdown box before clicking Apply)
  const [tempCity, setTempCity] = useState("All");
  const [tempRating, setTempRating] = useState("Any");
  const [tempMinPrice, setTempMinPrice] = useState(0);
  const [tempMaxPrice, setTempMaxPrice] = useState(5000);

  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch all approved service providers and available cities on mount
  useEffect(() => {
    async function fetchData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data: providers, error } = await supabase
        .from("sp_general_info")
        .select(`
          id,
          profiles_id,
          business_name,
          business_city,
          sp_img_facilities (
            business_facility_images
          ),
          booking_info (
            booking_overall_rating,
            booking_staff_rating
          ),
          sp_services (
            sp_service_options (
              service_price
            )
          )
        `)
        .eq("registration_status", "approved");

      if (error) {
        console.error("Error fetching service providers:", error);
      }

      // Hide service providers whose account is currently suspended.
      // First lift any suspension that has already run out, then look up who is still suspended.
      await supabase.rpc("lift_expired_suspensions");

      const allProviders = (providers || []) as unknown as ServiceProvider[];
      const profileIds = allProviders.map((p) => p.profiles_id).filter(Boolean);

      let suspendedIds = new Set<string>();
      if (profileIds.length > 0) {
        const { data: suspendedProfiles } = await supabase
          .from("profiles")
          .select("id")
          .in("id", profileIds)
          .eq("status", "suspended");
        suspendedIds = new Set((suspendedProfiles || []).map((p: { id: string }) => p.id));
      }

      const visibleProviders = allProviders.filter((p) => !suspendedIds.has(p.profiles_id));
      setServiceProviders(visibleProviders);

      // City filter only offers cities that still have a visible shop
      setAvailableCities(Array.from(new Set(visibleProviders.map((p) => p.business_city))));

      setLoading(false);
    }

    fetchData();
  }, [supabase, router]);

  const processedProviders = serviceProviders.map((shop) => {
    const coverImage =
      shop.sp_img_facilities && shop.sp_img_facilities.length > 0
        ? shop.sp_img_facilities[0].business_facility_images
        : "/placeholder-salon.png";

    let totalScore = 0;
    let ratingCount = 0;

    if (shop.booking_info && shop.booking_info.length > 0) {
      shop.booking_info.forEach((booking) => {
        if (booking.booking_overall_rating !== null && booking.booking_overall_rating !== undefined) {
          totalScore += booking.booking_overall_rating;
          ratingCount++;
        }
        if (booking.booking_staff_rating !== null && booking.booking_staff_rating !== undefined) {
          totalScore += booking.booking_staff_rating;
          ratingCount++;
        }
      });
    }

    const averageRating = ratingCount > 0 ? parseFloat((totalScore / ratingCount).toFixed(1)) : 0.0;
    const roundedRating = Math.round(averageRating);

    let prices: number[] = [];
    if (shop.sp_services) {
      shop.sp_services.forEach((service) => {
        if (service.sp_service_options) {
          service.sp_service_options.forEach((opt) => {
            if (typeof opt.service_price === "number") {
              prices.push(opt.service_price);
            }
          });
        }
      });
    }

    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const highestPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const priceDisplay = prices.length > 0 ? `₱${lowestPrice.toFixed(2)} - ₱${highestPrice.toFixed(2)}` : "Price not available";

    return {
      ...shop,
      coverImage,
      averageRating,
      roundedRating,
      lowestPrice,
      highestPrice,
      priceDisplay,
    };
  });

  // Filter providers locally based on applied states
  const filteredProviders = processedProviders.filter((shop) => {
    // City filter
    if (appliedCity !== "All" && !shop.business_city.toLowerCase().includes(appliedCity.toLowerCase())) {
      return false;
    }

    // Rating filter
    if (appliedRating !== "Any") {
      const targetStar = parseInt(appliedRating, 10);
      if (shop.roundedRating !== targetStar) return false;
    }

    // Price range filter
    if (shop.lowestPrice > appliedMaxPrice || shop.highestPrice < appliedMinPrice) {
      return false;
    }

    return true;
  });

  const handleApplyFilters = () => {
    setAppliedCity(tempCity);
    setAppliedRating(tempRating);
    setAppliedMinPrice(tempMinPrice);
    setAppliedMaxPrice(tempMaxPrice);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setTempCity("All");
    setTempRating("Any");
    setTempMinPrice(0);
    setTempMaxPrice(5000);

    setAppliedCity("All");
    setAppliedRating("Any");
    setAppliedMinPrice(0);
    setAppliedMaxPrice(5000);
    setShowFilters(false);
  };

  return (
    <div className="pet-owner-container">
      <main className="pet-owner-main">
        {/* Section Header */}
        <div className="explore-header" style={{ position: "relative" }} ref={filterRef}>
          <h1 className="explore-title">Explore Pet Grooming shops</h1>
          <button 
            type="button"
            className="filter-btn" 
            onClick={() => {
              setTempCity(appliedCity);
              setTempRating(appliedRating);
              setTempMinPrice(appliedMinPrice);
              setTempMaxPrice(appliedMaxPrice);
              setShowFilters(!showFilters);
            }}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "8px", 
              cursor: "pointer",
              background: "#fff",
              border: "1px solid #1e3a8a",
              color: "#1e3a8a",
              padding: "8px 18px",
              borderRadius: "20px",
              fontWeight: 600,
              boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
            }}
          >
            <FaSlidersH /> Filters
          </button>

          {/* Floating Filter Card Dropdown */}
          {showFilters && (
            <div className="filter-dropdown-card" style={{
              position: "absolute",
              right: 0,
              top: "50px",
              width: "340px",
              background: "#fff",
              borderRadius: "16px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              border: "1px solid #e5e7eb",
              padding: "20px",
              zIndex: 100,
              textAlign: "left"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6", paddingBottom: "12px", marginBottom: "15px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>Filter Options</h3>
                <button 
                  type="button"
                  onClick={handleResetFilters}
                  style={{ background: "none", border: "none", color: "#ef4444", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
                >
                  Reset All
                </button>
              </div>

              {/* LOCATION SECTION */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: 700, color: "#1e3a8a", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  <FaMapMarkerAlt /> LOCATION
                </label>
                <select 
                  value={tempCity}
                  onChange={(e) => setTempCity(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.95rem", background: "#fff", cursor: "pointer" }}
                >
                  <option value="All">All</option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* RATING SECTION (1 to 5 Stars) */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: 700, color: "#1e3a8a", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  <FaStar /> RATING (EXACT STARS)
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {["Any", "1", "2", "3", "4", "5"].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setTempRating(star)}
                      style={{
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        background: tempRating === star ? "#1e3a8a" : "#fff",
                        color: tempRating === star ? "#fff" : "#374151",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        cursor: "pointer"
                      }}
                    >
                      {star === "Any" ? "Any" : `${star} ★`}
                    </button>
                  ))}
                </div>
              </div>

              {/* PRICE RANGE SECTION (Type inputs only) */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: 700, color: "#1e3a8a", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  <FaTag /> PRICE RANGE (₱)
                </label>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280", display: "block", marginBottom: "4px" }}>Minimum</span>
                    <input 
                      type="number" 
                      value={tempMinPrice} 
                      onChange={(e) => setTempMinPrice(Number(e.target.value))}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.9rem" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280", display: "block", marginBottom: "4px" }}>Maximum</span>
                    <input 
                      type="number" 
                      value={tempMaxPrice} 
                      onChange={(e) => setTempMaxPrice(Number(e.target.value))}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.9rem" }}
                    />
                  </div>
                </div>
              </div>

              {/* Apply Button */}
              <button
                type="button"
                onClick={handleApplyFilters}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer"
                }}
              >
                Apply Filters
              </button>
            </div>
          )}
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="no-listings">
            <p>Loading grooming shops...</p>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="no-listings">
            <FaStore className="no-listings-icon" />
            <h3>No pet grooming shops match your filters</h3>
            <p>Try resetting your filter options to see more available shops.</p>
          </div>
        ) : (
          <div className="shop-grid">
            {filteredProviders.map((shop) => (
              <Link
                key={shop.id}
                href={`/pet_owner/book_appointment?sp_id=${shop.id}`}
                className="shop-card-link"
              >
                <div className="shop-card">
                  {/* Facility Image Cover */}
                  <div className="image-wrapper">
                    <img
                      src={shop.coverImage}
                      alt={shop.business_name}
                      className="shop-image"
                    />
                  </div>

                  {/* Card Content */}
                  <div className="shop-details">
                    <h3 className="shop-title">{shop.business_name}</h3>
                    <p className="shop-city">{shop.business_city}</p>
                    
                    {/* Dynamic Actual Lowest to Highest Price */}
                    <p className="shop-price">{shop.priceDisplay}</p>

                    {/* Dynamic Rating Badge */}
                    <div className="rating-badge">
                      <span className="rating-score">★ {shop.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}