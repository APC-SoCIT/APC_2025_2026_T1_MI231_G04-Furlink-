/* /src/app/(loggedIn)/service_provider/manage_listing/onboarding/components/ServiceCard.tsx */
import React from "react";

export default function ServiceCard({
  service,
  serviceIndex,
  updateService,
  removeService,
  validationErrors,
  children
}) {
  return (
    <div className="service-form-card">
      <div className="service-card-header">
        <div className={`service-type-badge ${service.type}`}>
          {service.type === "packaged_service" ? "Packaged Service" : "Individual Service"}
        </div>
        <button 
          type="button" 
          className="icon-btn-remove" 
          onClick={() => removeService(serviceIndex)}
          title="Remove Service"
        >
          ✕
        </button>
      </div>

      <div className="service-form-body">
        <div className="form-left">
          <div className="form-field">
            <label>Name of Service*</label>
            <input
              type="text"
              value={service.name}
              onChange={(e) => updateService(serviceIndex, "name", e.target.value)}
              placeholder="e.g. Full Grooming, Nail Trimming"
              className={validationErrors[`service_${serviceIndex}_name`] ? "input-error" : ""}
            />
            {validationErrors[`service_${serviceIndex}_name`] && (
              <small className="error">{validationErrors[`service_${serviceIndex}_name`]}</small>
            )}
          </div>

          <div className="form-field">
            <label>Description</label>
            <textarea
              value={service.description}
              onChange={(e) => updateService(serviceIndex, "description", e.target.value)}
              placeholder="Briefly describe what this service includes..."
              rows={2}
            />
          </div>

          <div className="form-field">
            <label>Notes</label>
            <textarea
              value={service.notes}
              onChange={(e) => updateService(serviceIndex, "notes", e.target.value)}
              placeholder="Any special requirements or notes for the pet owner..."
              rows={2}
            />
          </div>

          <div className="form-field checkbox-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={service.haircutIncluded}
                onChange={(e) => updateService(serviceIndex, "haircutIncluded", e.target.checked)}
                style={{ width: 'auto', margin: 0 }}
              />
              Includes Haircut / Styling
            </label>
          </div>
        </div>

        <div className="form-right">
          {children}
        </div>
      </div>
    </div>
  );
}