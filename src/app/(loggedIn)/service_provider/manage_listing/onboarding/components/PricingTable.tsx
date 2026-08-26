/* /src/app/(loggedIn)/service_provider/manage_listing/onboarding/components/PricingTable.tsx */
import React from "react";
import { PET_TYPES, ALL_SIZES_DATA, ALLOWED_SIZES } from "../hooks/useServiceManager";

export default function PricingTable({
  service,
  serviceIndex,
  updatePricing,
  removePricingRow,
  addPricingRow,
  validationErrors,
}) {
  
  const getAvailablePetTypes = (currentIndex) => {
    const currentRow = service.pricing[currentIndex];
    const otherRows = service.pricing.filter((_, idx) => idx !== currentIndex);
    const hasSpecific = otherRows.some((r) => r.petType === "dog" || r.petType === "cat");
    const hasGeneral = otherRows.some((r) => r.petType === "both_dog_cat");

    return PET_TYPES.filter((type) => {
      if (type.value === currentRow.petType) return true;
      if (hasSpecific && type.value === "both_dog_cat") return false;
      if (hasGeneral && (type.value === "dog" || type.value === "cat")) return false;
      return true;
    });
  };

  const getOptionsForPricingRow = (currentIndex) => {
    const currentRow = service.pricing[currentIndex];
    const allowedKeys = ALLOWED_SIZES[currentRow.petType] || [];
    const usedKeys = service.pricing
      .filter((r, idx) => idx !== currentIndex && r.petType === currentRow.petType)
      .map((r) => r.size);

    return ALL_SIZES_DATA.filter((sizeObj) => {
      if (!allowedKeys.includes(sizeObj.key)) return false;
      if (usedKeys.includes(sizeObj.key) && sizeObj.key !== currentRow.size) return false;
      return true;
    });
  };

  return (
    <div className="pricing-section">
      <label>Pricing Options*</label>
      
      <div className="pricing-table">
        <div className="pricing-header" style={{ gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr 1fr 40px' }}>
          <div>Pet Type</div>
          <div>Size</div>
          <div>Min (kg)</div>
          <div>Max (kg)</div>
          <div>Price (₱)</div>
          <div></div>
        </div>

        {service.pricing.map((pricing, pi) => {
          const isNa = pricing.size === "cat" || pricing.size === "all";

          return (
            <div key={pricing.id} className="pricing-row" style={{ gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr 1fr 40px' }}>
              
              <div className="pricing-cell">
                <select 
                  value={pricing.petType} 
                  onChange={(e) => updatePricing(serviceIndex, pi, "petType", e.target.value)}
                >
                  {getAvailablePetTypes(pi).map((pt) => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                </select>
              </div>

              <div className="pricing-cell">
                <select 
                  value={pricing.size} 
                  onChange={(e) => updatePricing(serviceIndex, pi, "size", e.target.value)}
                >
                  {getOptionsForPricingRow(pi).map((sz) => (
                    <option key={sz.key} value={sz.key}>{sz.label}</option>
                  ))}
                </select>
              </div>

              <div className="pricing-cell">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={pricing.minWeight}
                  onChange={(e) => updatePricing(serviceIndex, pi, "minWeight", e.target.value)}
                  disabled={isNa}
                  placeholder={isNa ? "N/A" : "Min"}
                  className={isNa ? "input-disabled" : validationErrors[`service_${serviceIndex}_pricing_${pi}_weight`] ? "input-error" : ""}
                />
              </div>

              <div className="pricing-cell">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={pricing.maxWeight}
                  onChange={(e) => updatePricing(serviceIndex, pi, "maxWeight", e.target.value)}
                  disabled={isNa}
                  placeholder={isNa ? "N/A" : "Max"}
                  className={isNa ? "input-disabled" : validationErrors[`service_${serviceIndex}_pricing_${pi}_weight`] ? "input-error" : ""}
                />
              </div>

              <div className="pricing-cell">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricing.price}
                  onChange={(e) => updatePricing(serviceIndex, pi, "price", e.target.value)}
                  placeholder="0.00"
                  className={validationErrors[`service_${serviceIndex}_pricing_${pi}_price`] ? "input-error" : ""}
                />
              </div>

              <div className="pricing-cell-action">
                {service.pricing.length > 1 && (
                  <button 
                    type="button" 
                    className="btn-remove-pricing" 
                    onClick={() => removePricingRow(serviceIndex, pi)}
                    title="Remove Variant"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {validationErrors[`service_${serviceIndex}_pricing`] && (
        <small className="error">{validationErrors[`service_${serviceIndex}_pricing`]}</small>
      )}
      {validationErrors[`service_${serviceIndex}_pricing_weights`] && (
        <small className="error">{validationErrors[`service_${serviceIndex}_pricing_weights`]}</small>
      )}

      {!service.pricing.some((p) => p.petType === "both_dog_cat") && (
        <button type="button" className="btn-add-pricing" onClick={() => addPricingRow(serviceIndex)}>
          + Add Pricing Variant
        </button>
      )}
    </div>
  );
}