'use client';

export function NewOrderButton() {
  return (
    <button
      onClick={() => {
        window.location.href = '/orders/plans';
      }}
      className="border-2 border-nordic-blue text-nordic-blue font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
    >
      Nytt abonnement
    </button>
  );
}
