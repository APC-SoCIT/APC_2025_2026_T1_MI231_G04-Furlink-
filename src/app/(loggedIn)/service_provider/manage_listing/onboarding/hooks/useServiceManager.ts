/* /src/app/(loggedIn)/service_provider/manage_listing/onboarding/hooks/useServiceManager.ts */
import { useState } from "react";

export interface PricingRow {
  petType: string;
  size: string;
  minWeight: string;
  maxWeight: string;
  price: string;
}

export interface ServiceItem {
  type: string;
  name: string;
  description: string;
  pricing: PricingRow[];
}

const DEFAULT_SIZES: Record<string, string[]> = {
  dog: ["small", "medium", "large", "giant", "all"],
  cat: ["cat", "all"],
  both_dog_cat: ["all", "small", "medium", "large", "giant"],
};

export function useServiceManager() {
  const [services, setServices] = useState<ServiceItem[]>([]);

  const addService = (type: string) => {
    setServices((prev: ServiceItem[]) => [
      ...prev,
      {
        type,
        name: "",
        description: "",
        pricing: [{ petType: "dog", size: "small", minWeight: "", maxWeight: "", price: "" }],
      },
    ]);
  };

  const removeService = (index: number) => {
    setServices((prev: ServiceItem[]) => prev.filter((_: ServiceItem, i: number) => i !== index));
  };

  const updateService = (index: number, field: string, value: any) => {
    setServices((prev: ServiceItem[]) =>
      prev.map((s: ServiceItem, i: number) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const addPricingRow = (serviceIndex: number) => {
    setServices((prev: ServiceItem[]) =>
      prev.map((s: ServiceItem, i: number) =>
        i === serviceIndex
          ? {
              ...s,
              pricing: [
                ...s.pricing,
                { petType: "dog", size: "small", minWeight: "", maxWeight: "", price: "" },
              ],
            }
          : s
      )
    );
  };

  const removePricingRow = (serviceIndex: number, pricingIndex: number) => {
    setServices((prev: ServiceItem[]) =>
      prev.map((s: ServiceItem, i: number) =>
        i === serviceIndex
          ? {
              ...s,
              pricing: s.pricing.filter((_: PricingRow, j: number) => j !== pricingIndex),
            }
          : s
      )
    );
  };

  const updatePricing = (serviceIndex: number, pricingIndex: number, field: string, value: any) => {
    setServices((prev: ServiceItem[]) =>
      prev.map((s: ServiceItem, i: number) =>
        i === serviceIndex
          ? {
              ...s,
              pricing: s.pricing.map((p: PricingRow, j: number) => {
                if (j === pricingIndex) {
                  const updatedP = { ...p, [field]: value };
                  
                  // Fixes the TS7053 index type error safely
                  if (field === "petType") {
                    const newType = value as string;
                    const validSizes = DEFAULT_SIZES[newType] || ["all"];
                    // If the current size isn't valid for the new pet type, reset it
                    if (!validSizes.includes(updatedP.size)) {
                      updatedP.size = validSizes[0];
                    }
                  }
                  
                  return updatedP;
                }
                return p;
              }),
            }
          : s
      )
    );
  };

  const saveServicesToSupabase = async (supabase: any, providerId: string) => {
    try {
      // Delete existing services to replace them completely
      const { error: delErr } = await supabase.from("sp_services").delete().eq("sp_id", providerId);
      if (delErr) throw delErr;

      for (const s of services) {
        // Insert Service
        const { data: serviceData, error: sErr } = await supabase
          .from("sp_services")
          .insert({
            sp_id: providerId,
            service_name: s.name,
            service_description: s.description,
            service_type: s.type,
          })
          .select()
          .single();

        if (sErr) throw sErr;

        // Insert Pricing for the service
        const pricingPayload = s.pricing.map((p: PricingRow) => ({
          service_id: serviceData.id,
          pet_type: p.petType,
          pet_size: p.size,
          min_weight: p.minWeight ? parseFloat(p.minWeight as string) : null,
          max_weight: p.maxWeight ? parseFloat(p.maxWeight as string) : null,
          price: parseFloat(p.price as string),
        }));

        if (pricingPayload.length > 0) {
          const { error: pErr } = await supabase.from("sp_pricing").insert(pricingPayload);
          if (pErr) throw pErr;
        }
      }

      return { success: true };
    } catch (err: unknown) {
      // Fixes the 'err is of type unknown' error
      const errorMsg = err instanceof Error ? err.message : "Failed to save services";
      console.error("Service Save Error:", err);
      return { success: false, message: errorMsg };
    }
  };

  return {
    services,
    addService,
    removeService,
    updateService,
    addPricingRow,
    removePricingRow,
    updatePricing,
    saveServicesToSupabase,
  };
}