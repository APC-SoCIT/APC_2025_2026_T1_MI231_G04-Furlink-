"use client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function SPDetailsPage() {
  const searchParams = useSearchParams();
  const providerId = searchParams.get("id"); 

  useEffect(() => {
    if (providerId) {
    }
  }, [providerId]);

  return <div>Details</div>;
}