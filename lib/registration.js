// Single source of truth for the registration form's option lists, the CSV
// export and the admin panel — so a label never drifts between them.

export const AGE_RANGES = ["Below 18", "18 to 24", "25 to 29", "30 to 39", "40 and above"];

export const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

export const JOINING_OPTIONS = [
  "I'm coming solo",
  "I'm coming with one other person",
  "I'm coming with a group of three or more",
];

export const HEARD_FROM_OPTIONS = [
  "Suzzy/Suzzysaur",
  "RUMBLE ROYALE",
  "FACEBOOK group",
  "FACEBOOK post",
  "Instagram Post",
  "Friend or family member",
  "Invited by an organizer",
  "A Friend",
  "Other",
];

export const PAYMENT_METHODS = [
  { id: "gcash", label: "GCash", qr: "/qr-gcash.png" },
  { id: "gotyme", label: "GoTyme", qr: "/qr-gotyme.png" },
];

export const CANCELLATION_TERMS = [
  "I understand that no cash refunds will be issued for cancellations.",
  "If an emergency arises, I will notify the RUMBLE team as early as possible so my slot can be reassigned.",
  "I understand my entry fee can be transferred to a future event OR converted into RUMBLE consumables (merch, food, or future event credits).",
];

export const SAFETY_TERMS = [
  "Outside Food Policy: I agree to abide by the no outside food/drinks policy to support the venue, unless I have a pre-cleared allergy/dietary condition.",
  "Liability & Equipment Waiver: I agree to take care of my personal property and computer equipment while at RUMBLE / RR Stronghold. RUMBLE ROYALE and its staff are not liable for any personal injury, loss, damage, or theft of personal items during or after the event.",
];

export const PRIVACY_NOTICE = [
  "In accordance with the Data Privacy Act of 2012, all personal information collected in this form (including your name, contact details, gaming profiles, and payment information) will be used solely by RUMBLE for registration, squad balancing, identity verification, and event updates for THE GAUNTLET.",
  "Your information will be kept confidential, stored securely, and will not be shared with unauthorized third parties. By proceeding with this sign-up form, you consent to the collection and processing of your personal data for these purposes.",
];

export const PRIVACY_CONSENT =
  "I have read the Data Privacy Notice and agree to the collection and processing of my personal details for this event.";

export const PROOF_BUCKET = "payment-proofs";
export const MAX_PROOF_BYTES = 10 * 1024 * 1024; // 10 MB, matching the old form
