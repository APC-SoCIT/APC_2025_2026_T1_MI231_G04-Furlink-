import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Header from "@/components/HeaderLoggedIn"; // Aayusin ko pa sa kabilang branch
import Footer from "@/components/Footer"; // Aayusin ko pa sa kabilang branch
// Need pa mag import for src/app/pet_owner/layout.tsx

export default async function PetOwnerPage() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const username = session.user.user_metadata.username || "User";

  return (
    <div className="page-container">
      {/* Pass the session or username if your Header needs to display it */}
      <Header /> 
      
      <main className="content">
        <h1>Welcome to Furlink, @{username}!</h1>
        <p>This is your pet owner dashboard.</p>
      </main>

      <Footer />
    </div>
  );
}