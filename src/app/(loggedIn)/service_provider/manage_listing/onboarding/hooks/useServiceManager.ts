/* /src/app/(loggedIn)/service_provider/manage_listing/onboarding/hooks/useServiceManager.ts */
import { useState, useEffect } from "react";

// Allowed sizes based on your database constraints
export const ALL_SIZES_DATA = [
  { key: "extra_small", label: "Extra Small" },
  { key: "small", label: "Small" },
  { key: "medium", label: "Medium" },
  { key: "large", label: "Large" },
  { key: "extra_large", label: "Extra Large" },
  { key: "cat", label: "Cat (Standard)" },
  { key: "all", label: "General / All Sizes" },
];

export const ALLOWED_SIZES = {
  dog: ["extra_small", "small", "medium", "large", "extra_large"],
  cat: ["extra_small", "small", "medium", "large", "extra_large", "cat"],
  both_dog_cat: ["all"],
};

export const PET_TYPES = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "both_dog_cat", label: "Dog & Cat" },
];

export function useServiceManager() {
  // Helper to create an empty service structure
  const createNewService = (type = "packaged_service") => ({
    type, // 'individual_service' or 'packaged_service'
    name: "",
    description: "",
    notes: "",
    haircutIncluded: false, // maps to service_haircut_included
    pricing: [
      {
        id: Date.now().toString(),
        petType: "dog",
        size: "extra_small",
        sizeLabel: "Extra Small",
        minWeight: "",
        maxWeight: "",
        price: "",
      },
    ],
  });

  const [services, setServices] = useState(() => {
    try {
      const saved = localStorage.getItem("provider_services");
      return saved ? JSON.parse(saved) : [createNewService("packaged_service")];
    } catch {
      return [createNewService("packaged_service")];
    }
  });

  // Keep local storage synchronized
  useEffect(() => {
    localStorage.setItem("provider_services", JSON.stringify(services));
  }, [services]);

  const addService = (type) => {
    setServices((prev) => [...prev, createNewService(type)]);
  };

  const removeService = (index) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
  };

  const updateService = (index, field, value) => {
    setServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const addPricingRow = (serviceIndex) => {
    setServices((prev) =>
      prev.map((s, i) => {
        if (i !== serviceIndex) return s;
        if (s.pricing.some((p) => p.petType === "both_dog_cat")) return s;

        const lastRow = s.pricing[s.pricing.length - 1];
        let defaultType = lastRow ? lastRow.petType : "dog";
        if (defaultType === "cat" && lastRow.size === "cat") defaultType = "dog";

        const allowed = ALLOWED_SIZES[defaultType] || [];
        const used = s.pricing
          .filter((p) => p.petType === defaultType)
          .map((p) => p.size);
        const defaultSize = allowed.find((sz) => !used.includes(sz)) || allowed[0];
        const defaultLabel =
          ALL_SIZES_DATA.find((x) => x.key === defaultSize)?.label || "Extra Small";
        const isNaWeight = defaultSize === "cat" || defaultSize === "all";

        return {
          ...s,
          pricing: [
            ...s.pricing,
            {
              id: `${Date.now()}_${Math.random()}`,
              petType: defaultType,
              size: defaultSize,
              sizeLabel: defaultLabel,
              minWeight: isNaWeight ? "N/A" : "",
              maxWeight: isNaWeight ? "N/A" : "",
              price: "",
            },
          ],
        };
      })
    );
  };

  const removePricingRow = (serviceIndex, pricingIndex) => {
    setServices((prev) =>
      prev.map((s, i) =>
        i === serviceIndex
          ? {
              ...s,
              pricing: s.pricing.filter((_, j) => j !== pricingIndex),
            }
          : s
      )
    );
  };

  const updatePricing = (serviceIndex, pricingIndex, field, value) => {
    setServices((prev) =>
      prev.map((s, i) =>
        i === serviceIndex
          ? {
              ...s,
              pricing: s.pricing.map((p, j) => {
                if (j !== pricingIndex) return p;
                const updated = { ...p, [field]: value };

                if (field === "petType") {
                  const allowed = ALLOWED_SIZES[value] || [];
                  let newSize = allowed[0];
                  if (value === "both_dog_cat") newSize = "all";

                  updated.size = newSize;
                  const sizeObj = ALL_SIZES_DATA.find((x) => x.key === newSize);
                  updated.sizeLabel = sizeObj ? sizeObj.label : "";
                  const isNa = newSize === "cat" || newSize === "all";
                  updated.minWeight = isNa ? "N/A" : "";
                  updated.maxWeight = isNa ? "N/A" : "";
                }

                if (field === "size") {
                  const sizeData = ALL_SIZES_DATA.find((sz) => sz.key === value);
                  if (sizeData) {
                    updated.sizeLabel = sizeData.label;
                    if (value === "all") {
                      updated.petType = "both_dog_cat";
                      updated.minWeight = "N/A";
                      updated.maxWeight = "N/A";
                    } else if (value === "cat") {
                      updated.minWeight = "N/A";
                      updated.maxWeight = "N/A";
                    } else {
                      if (updated.minWeight === "N/A") updated.minWeight = "";
                      if (updated.maxWeight === "N/A") updated.maxWeight = "";
                    }
                  }
                }

                return updated;
              }),
            }
          : s
      )
    );
  };

  /** Database Persistence handler mapping to sp_services and sp_service_options */
  const saveServicesToSupabase = async (supabase, providerId) => {
    try {
      // 1. Clear existing services to handle seamless reapplication cycles
      const { data: oldServices } = await supabase
        .from("sp_services")
        .select("id")
        .eq("sp_id", providerId);

      if (oldServices && oldServices.length > 0) {
        const oldIds = oldServices.map((s) => s.id);
        await supabase.from("sp_service_options").delete().in("sp_services_id", oldIds);
        await supabase.from("sp_services").delete().eq("sp_id", providerId);
      }

      // 2. Insert new services and their option pricing rows
      for (const service of services) {
        const { data: serviceData, error: serviceError } = await supabase
          .from("sp_services")
          .insert([
            {
              sp_id: providerId,
              service_type: service.type,
              service_name: service.name,
              service_description: service.description || "No description",
              service_notes: service.notes || null,
              service_haircut_included: service.haircutIncluded,
              service_status: "active",
            },
          ])
          .select()
          .single();

        if (serviceError) throw serviceError;

        const optionsPayload = service.pricing.map((p) => ({
          sp_services_id: serviceData.id,
          pet_type: p.petType,
          pet_size: p.size,
          pet_min_weight_range: p.minWeight === "N/A" ? 0 : parseFloat(p.minWeight),
          pet_max_weight_range: p.maxWeight === "N/A" ? 0 : parseFloat(p.maxWeight),
          service_price: parseFloat(p.price).toFixed(2),
          option_status: "active",
        }));

        const { error: optionsError } = await supabase
          .from("sp_service_options")
          .insert(optionsPayload);

        if (optionsError) throw optionsError;
      }

      localStorage.removeItem("provider_services");
      return { success: true };
    } catch (err) {
      console.error("Service save error:", err);
      return { success: false, message: err.message };
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