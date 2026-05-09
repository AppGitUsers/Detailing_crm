export const jobCardTotal = (jobCard) =>
  (jobCard?.job_card_services || []).reduce(
    (sum, s) => sum + Number(s.price_at_time || 0),
    0
  );
