import { BOOKING_PRICE, BOOKING_PRICE_ORIGINAL, WEEK_CAPACITY } from "./booking";

// Things the organisers change often enough that editing code for them is
// silly. Stored one row per key so adding a setting never means a migration.
//
// lib/booking.js stays the source of the defaults: if the table is missing, a
// key is absent, or the query fails, every surface falls back to it rather
// than rendering a blank price. A booking page showing no price at all is
// worse than one showing a stale number.
export const SETTING_DEFAULTS = {
  booking_price: BOOKING_PRICE,
  booking_price_original: BOOKING_PRICE_ORIGINAL,
  week_capacity: String(WEEK_CAPACITY),
};

export const SETTING_FIELDS = [
  {
    key: "booking_price",
    label: "Gauntlet ticket price",
    hint: "What people actually pay. Include the ₱.",
    placeholder: "₱750",
  },
  {
    key: "booking_price_original",
    label: "Struck-through price",
    hint: "Shown crossed out beside it. Leave blank for no strike-through.",
    placeholder: "₱1,499",
    allowBlank: true,
  },
  {
    key: "week_capacity",
    label: "Seats per week",
    hint: "How many tickets a Gauntlet week sells before it reads sold out.",
    placeholder: "36",
    numeric: true,
  },
];

export async function getSettings(supabase) {
  try {
    const { data, error } = await supabase.from("settings").select("key,value");
    if (error) return { ...SETTING_DEFAULTS };
    const merged = { ...SETTING_DEFAULTS };
    (data || []).forEach((row) => {
      // An empty string is a deliberate "show nothing" for the struck price,
      // so only null/undefined falls back to the default.
      if (row.value !== null && row.value !== undefined) merged[row.key] = row.value;
    });
    return merged;
  } catch {
    return { ...SETTING_DEFAULTS };
  }
}

// Shapes the raw strings into what the booking surfaces actually want.
export function bookingFromSettings(settings) {
  const cap = parseInt(settings.week_capacity, 10);
  return {
    price: settings.booking_price || BOOKING_PRICE,
    priceOriginal: settings.booking_price_original?.trim() ? settings.booking_price_original : null,
    capacity: Number.isInteger(cap) && cap > 0 ? cap : WEEK_CAPACITY,
  };
}
