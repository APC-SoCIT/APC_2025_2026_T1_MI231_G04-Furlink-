import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Footer from "@/components/Footer";
import { FaSlidersH, FaStore } from "react-icons/fa";
import "./browse_listing.css";

type FacilityImage = {
  business_facility_images: string;
};

type BookingRating = {
  booking_overall_rating: number | null;
  booking_staff_rating: number | null;
};

type ServiceProvider = {
  id: string;
  business_name: string;
  business_city: string;
  sp_img_facilities?: FacilityImage[];
  booking_info?: BookingRating[];
};

export default async function PetOwnerPage() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch approved service providers with their facility images and booking ratings
  const { data: providers, error } = await supabase
    .from("sp_general_info")
    .select(`
      id,
      business_name,
      business_city,
      sp_img_facilities (
        business_facility_images
      ),
      booking_info (
        booking_overall_rating,
        booking_staff_rating
      )
    `)
    .eq("registration_status", "approved");

  if (error) {
    console.error("Error fetching service providers:", error);
  }

  const serviceProviders: ServiceProvider[] = providers || [];

  return (
    <div className="pet-owner-container">
      <main className="pet-owner-main">
        {/* Section Header */}
        <div className="explore-header">
          <h1 className="explore-title">Explore Pet Grooming shops</h1>
          <button className="filter-btn">
            <FaSlidersH /> Filters
          </button>
        </div>

        {/* Listings Grid */}
        {serviceProviders.length === 0 ? (
          <div className="no-listings">
            <FaStore className="no-listings-icon" />
            <h3>No pet grooming shops available yet</h3>
            <p>Check back later for newly approved grooming service providers.</p>
          </div>
        ) : (
          <div className="shop-grid">
            {serviceProviders.map((shop) => {
              // Extract the first image from facility images array or fallback
              const coverImage =
                shop.sp_img_facilities && shop.sp_img_facilities.length > 0
                  ? shop.sp_img_facilities[0].business_facility_images
                  : "/placeholder-salon.png";

              // Compute Average Rating from booking_overall_rating and booking_staff_rating
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

              const averageRating = ratingCount > 0 ? (totalScore / ratingCount).toFixed(1) : "0.0";

              return (
                <Link
                  key={shop.id}
                  href={`/pet_owner/book_appointment?sp_id=${shop.id}`}
                  className="shop-card-link"
                >
                  <div className="shop-card">
                    {/* Facility Image Cover */}
                    <div className="image-wrapper">
                      <img
                        src={coverImage}
                        alt={shop.business_name}
                        className="shop-image"
                      />
                    </div>

                    {/* Card Content */}
                    <div className="shop-details">
                      <h3 className="shop-title">{shop.business_name}</h3>
                      <p className="shop-city">{shop.business_city}</p>
                      
                      {/* Price Range Placeholder */}
                      <p className="shop-price">₱250.00 - ₱1000.00</p>

                      {/* Dynamic Rating Badge */}
                      <div className="rating-badge">
                        <span className="rating-score">★ {averageRating}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}