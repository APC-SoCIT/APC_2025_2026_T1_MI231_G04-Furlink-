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
  notes: string;
  haircutIncluded: boolean;
  pricing: PricingRow[];
}

// UPDATED: 'cat' now shares the exact same size options as 'dog'
const DEFAULT_SIZES: Record<string, string[]> = {
  dog: ["extra_small", "small", "medium", "large", "extra_large", "all"],
  cat: ["extra_small", "small", "medium", "large", "extra_large", "all"],
  both_dog_cat: ["all", "extra_small", "small", "medium", "large", "extra_large"],
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
        notes: "",
        haircutIncluded: false,
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
                  
                  if (field === "petType") {
                    const newType = value as string;
                    const validSizes = DEFAULT_SIZES[newType] || ["all"];
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
      const { error: delErr } = await supabase.from("sp_services").delete().eq("sp_id", providerId);
      if (delErr) throw delErr;

      for (const s of services) {
        const { data: serviceData, error: sErr } = await supabase
          .from("sp_services")
          .insert({
            sp_id: providerId,
            service_name: s.name,
            service_description: s.description,
            service_type: s.type,
            service_notes: s.notes || null,
            service_haircut_included: s.haircutIncluded || false,
          })
          .select()
          .single();

        if (sErr) throw sErr;

        const pricingPayload = s.pricing.map((p: PricingRow) => {
          const minW = p.minWeight ? parseFloat(p.minWeight as string) : 0;
          const maxW = p.maxWeight ? parseFloat(p.maxWeight as string) : 999;

          return {
            sp_services_id: serviceData.id,
            pet_type: p.petType,
            pet_size: p.size,
            pet_min_weight_range: minW,
            pet_max_weight_range: maxW,
            service_price: parseFloat(p.price as string),
          };
        });

        if (pricingPayload.length > 0) {
          const { error: pErr } = await supabase.from("sp_service_options").insert(pricingPayload);
          if (pErr) throw pErr;
        }
      }

      return { success: true };
    } catch (err: any) {
      const errorMsg = err?.message || err?.details || err?.hint || "Failed to save services";
      console.error("Service Save Error:", err?.message || err);
      
      return { success: false, message: errorMsg };
    }
  };

  return {
    services,
    setServices,
    addService,
    removeService,
    updateService,
    addPricingRow,
    removePricingRow,
    updatePricing,
    saveServicesToSupabase,
  };
}