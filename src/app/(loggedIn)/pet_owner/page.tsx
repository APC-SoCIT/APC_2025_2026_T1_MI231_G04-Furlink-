import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Footer from "@/components/Footer";

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
      {/* Header is handled by src/app/(loggedIn)/layout.tsx */}
      
      <main className="content">
        <h1>Welcome to Furlink, @{username}!</h1>
        <p>This is your pet owner dashboard.</p>
      </main>

      <Footer />
    </div>
  );
}