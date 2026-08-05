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

type ServiceProvider = {
  id: string;
  business_name: string;
  business_city: string;
  sp_img_facilities?: FacilityImage[];
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

  // Fetch approved service providers with their facility images
  const { data: providers, error } = await supabase
    .from("sp_general_info")
    .select(`
      id,
      business_name,
      business_city,
      sp_img_facilities (
        business_facility_images
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

              return (
                <Link
                  key={shop.id}
                  href={`/pet_owner/booking/${shop.id}`}
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

                      {/* Rating Placeholder Badge */}
                      <div className="rating-badge">
                        <span className="rating-score">0.0</span>
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