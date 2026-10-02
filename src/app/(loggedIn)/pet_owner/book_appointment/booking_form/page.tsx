'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Footer from '@/components/Footer';

import { HeaderBar } from './components/HeaderBar';
import { InfoSummaryCard } from './components/InfoSummaryCard';
import { PetFormCard } from './components/PetFormCard';
import { SummaryModal } from './components/SummaryModal';
import { SuccessModal } from './components/SuccessModal';
import { FailedModal } from './components/FailedModal';
import { PayLaterSuccessModal } from './components/PayLaterSuccessModal';
import { CapacityModal } from './components/CapacityModal';

import { useFreshUser } from './hooks/useFreshUser';
import { useBookingParams } from './hooks/useBookingParams';
import { useActiveBookingId } from './hooks/useActiveBookingId';
import { useBookingModals } from './hooks/useBookingModals';
import { usePaymentCooldown } from './hooks/usePaymentCooldown';
import { usePaymentRedirect } from './hooks/usePaymentRedirect';
import { useSlotCapacity } from './hooks/useSlotCapacity';
import { useServices } from './hooks/useServices';
import { useRegisteredPets } from './hooks/useRegisteredPets';
import { usePetBreeds } from './hooks/usePetBreeds';
import { usePetForms } from './hooks/usePetForms';
import { useAiHaircutPreview } from './hooks/useAiHaircutPreview';
import { usePetValidation } from './hooks/usePetValidation';
import { useBookingActions } from './hooks/useBookingActions';
import { formatDateForSummary } from './utils/dateFormat';
import { getMaxAcceptedWeight } from './validation';

import './booking_form.css';

function BookingFormContent() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const getFreshUser = useFreshUser(supabase);

  // URL params + shared state
  const {
    spId,
    dateStr,
    timeSlot,
    queryPetsCount,
    statusParam,
    bookingIdParam,
    formattedDateDisplay,
  } = useBookingParams();
  const [activeBookingId, setActiveBookingId] = useActiveBookingId(bookingIdParam);
  const modals = useBookingModals();
  const cooldown = usePaymentCooldown();

  usePaymentRedirect({
    supabase,
    statusParam,
    activeBookingId,
    setShowSuccessModal: modals.setShowSuccessModal,
    setShowFailedModal: modals.setShowFailedModal,
    setShowSummaryModal: modals.setShowSummaryModal,
  });

  // Remote data
  const slotCapacity = useSlotCapacity(supabase, spId, dateStr, queryPetsCount);
  const { availableServices, serviceWeightOptions, loadingServices } = useServices(supabase, spId);
  const userRegisteredPets = useRegisteredPets(supabase);
  const { dogBreeds, catBreeds, loadingBreeds } = usePetBreeds();

  // Form state
  const petFormsApi = usePetForms({
    initialCount: queryPetsCount,
    slotCapacity,
    serviceWeightOptions,
    userRegisteredPets,
    onCapacityReached: () => modals.setShowCapacityModal(true),
  });
  const { petForms, grandTotal } = petFormsApi;

  const { petErrors, showValidation, handleProceedToSummary } = usePetValidation({
    petForms,
    serviceWeightOptions,
    availableServices,
    onValid: () => modals.setShowSummaryModal(true),
  });

  const aiPreview = useAiHaircutPreview({
    supabase,
    petForms,
    patchPetForm: petFormsApi.patchPetForm,
    getFreshUser,
  });

  const { isSubmitting, isSavingPayLater, handleConfirmBooking, handlePayLater } =
    useBookingActions({
      supabase,
      getFreshUser,
      spId,
      dateStr,
      timeSlot,
      formattedDateDisplay,
      petForms,
      availableServices,
      grandTotal,
      activeBookingId,
      setActiveBookingId,
      cooldownUntil: cooldown.cooldownUntil,
      timeRemaining: cooldown.timeRemaining,
      registerAttempt: cooldown.registerAttempt,
      setShowFailedModal: modals.setShowFailedModal,
      setShowSummaryModal: modals.setShowSummaryModal,
      setShowPayLaterSuccessModal: modals.setShowPayLaterSuccessModal,
    });

  return (
    <div className="booking-form-page">
      <main className="booking-form-main">
        <HeaderBar onBack={() => router.back()} />

        <InfoSummaryCard
          dateDisplay={formattedDateDisplay}
          timeSlot={timeSlot}
          grandTotal={grandTotal}
          onProceed={handleProceedToSummary}
        />

        {petForms.map((pet, index) => (
          <PetFormCard
            key={pet.id}
            pet={pet}
            index={index}
            isLast={index === petForms.length - 1}
            totalPets={petForms.length}
            userRegisteredPets={userRegisteredPets}
            takenRegisteredPetIds={petFormsApi.getTakenRegisteredPetIds(pet.id)}
            availableServices={availableServices}
            loadingServices={loadingServices}
            dogBreeds={dogBreeds}
            catBreeds={catBreeds}
            loadingBreeds={loadingBreeds}
            onAddPet={petFormsApi.handleAddPet}
            onDeletePet={petFormsApi.handleDeletePet}
            onUpdateField={petFormsApi.updatePetField}
            onServiceChange={petFormsApi.handleServiceChange}
            onAddServiceField={petFormsApi.handleAddServiceField}
            onRemoveServiceField={petFormsApi.handleRemoveServiceField}
            onAutofillPet={petFormsApi.handleAutofillPet}
            onToggleBehavior={petFormsApi.toggleBehavior}
            onUploadPetPhoto={aiPreview.handleUploadPetPhoto}
            onRemovePetPhoto={aiPreview.handleRemovePetPhoto}
            onGenerateAiPreview={aiPreview.handleGenerateAiPreview}
            onConfirmAiPreview={aiPreview.handleConfirmAiPreview}
            onEditConfirmedAiPreview={aiPreview.handleEditConfirmedAiPreview}
            errors={showValidation ? petErrors[pet.id] : {}}
            maxWeight={getMaxAcceptedWeight(pet, serviceWeightOptions)}
          />
        ))}
      </main>

      {modals.showSummaryModal && (
        <SummaryModal
          petForms={petForms}
          availableServices={availableServices}
          grandTotal={grandTotal}
          isSubmitting={isSubmitting}
          cooldownUntil={cooldown.cooldownUntil}
          formatDateForSummary={formatDateForSummary}
          onClose={() => modals.setShowSummaryModal(false)}
          onConfirm={handleConfirmBooking}
        />
      )}

      {modals.showSuccessModal && (
        <SuccessModal onRedirect={() => router.push('/pet_owner/manage_bookings')} />
      )}

      {modals.showFailedModal && !modals.showSuccessModal && (
        <FailedModal
          cooldownUntil={cooldown.cooldownUntil}
          timeRemaining={cooldown.timeRemaining}
          paymentAttempts={cooldown.paymentAttempts}
          isSavingPayLater={isSavingPayLater}
          onRetry={() => {
            modals.setShowFailedModal(false);
            modals.setShowSummaryModal(true);
          }}
          onPayLater={handlePayLater}
        />
      )}

      {modals.showPayLaterSuccessModal && (
        <PayLaterSuccessModal
          onRedirect={() => {
            modals.setShowPayLaterSuccessModal(false);
            router.push('/pet_owner/manage_bookings');
          }}
        />
      )}

      {modals.showCapacityModal && (
        <CapacityModal
          slotCapacity={slotCapacity}
          timeSlot={timeSlot}
          onClose={() => modals.setShowCapacityModal(false)}
        />
      )}

      <Footer />
    </div>
  );
}

export default function BookingFormPage() {
  return (
    <Suspense fallback={<div className="loading-fallback">Loading booking form...</div>}>
      <BookingFormContent />
    </Suspense>
  );
}