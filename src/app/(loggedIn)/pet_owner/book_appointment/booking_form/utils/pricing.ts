import { SelectedServiceItem, ServiceWeightOption } from '../types';

export function calculateSizeAndPrice(
  weightStr: string,
  pType: 'Dog' | 'Cat',
  selectedSvcs: SelectedServiceItem[],
  serviceWeightOptions: ServiceWeightOption[],
) {
  const w = parseFloat(weightStr);
  const targetPetType = pType.toLowerCase();

  if (isNaN(w) || w < 0) {
    return {
      sizeLabel: 'AUTO-CALC',
      updatedServices: selectedSvcs.map((s) => ({ ...s, price: 0, matchedOptionId: null })),
    };
  }

  let detectedSize = 'AUTO-CALC';
  const updatedServices = selectedSvcs.map((item) => {
    if (!item.serviceId) return { ...item, price: 0, matchedOptionId: null };

    const matched = serviceWeightOptions.find((opt) => {
      if (opt.sp_services_id !== item.serviceId) return false;
      const isTypeMatch = opt.pet_type === 'both_dog_cat' || opt.pet_type === targetPetType;
      const isWeightMatch =
        w >= Number(opt.pet_min_weight_range) && w <= Number(opt.pet_max_weight_range);
      return isTypeMatch && isWeightMatch;
    });

    if (matched) {
      detectedSize = matched.pet_size;
      return { ...item, matchedOptionId: matched.id, price: Number(matched.service_price) };
    }
    return { ...item, matchedOptionId: null, price: 0 };
  });

  return { sizeLabel: detectedSize, updatedServices };
}