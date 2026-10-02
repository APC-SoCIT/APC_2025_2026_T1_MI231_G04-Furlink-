import React from 'react';

const REFUND_PERCENT = 30;
const FORFEIT_PERCENT = 100 - REFUND_PERCENT; // 70

const formatPeso = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  /** Optional: when provided, the notice also shows the exact peso amounts. */
  totalAmount?: number;
  /** Short one-line version, for use next to the "Proceed to Summary" button. */
  compact?: boolean;
}

export function CancellationPolicyNotice({ totalAmount, compact = false }: Props) {
  if (compact) {
    return (
      <div className="cancellation-policy-notice cancellation-policy-notice--compact" role="note">
        <strong>Cancellation policy:</strong> {FORFEIT_PERCENT}% of the payment made will not be
        refunded and goes to the service provider. Only {REFUND_PERCENT}% is refunded.
      </div>
    );
  }

  const showAmounts = typeof totalAmount === 'number' && totalAmount > 0;

  return (
    <div className="cancellation-policy-notice" role="note">
      <p className="cancellation-policy-title">Cancellation Policy</p>
      <p className="cancellation-policy-text">
        If you cancel this booking, <strong>{FORFEIT_PERCENT}% of the payment made will not be
        refunded</strong> and will go to the service provider. Only{' '}
        <strong>{REFUND_PERCENT}%</strong> of the payment will be refunded to you.
      </p>
      {showAmounts && (
        <p className="cancellation-policy-amounts">
          Based on your total of {formatPeso(totalAmount!)}: refundable{' '}
          <strong>{formatPeso(totalAmount! * (REFUND_PERCENT / 100))}</strong> · non-refundable{' '}
          <strong>{formatPeso(totalAmount! * (FORFEIT_PERCENT / 100))}</strong>
        </p>
      )}
    </div>
  );
}