/**
 * Guest limits & extra-guest charges for a room. Shared by the booking page (browser) and the server,
 * so the price a guest sees is exactly the price they pay.
 *
 * Who is "extra": adults fill the guests included in the price first, then children who are at or above the
 * free age. Children under the free age are always free and don't count towards the total.
 */
export type Occupancy = {
  name?: string;
  baseGuests: number;
  maxGuests: number;
  maxAdults?: number | null;
  maxChildren?: number | null;
  extraGuestPrice: number;
  extraChildPrice?: number | null;
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export function guestCharges(room: Occupancy, adults: number, childAges: number[], freeAge: number) {
  const paying = childAges.filter((a) => a >= freeAge).length;
  const extraAdults = Math.max(0, adults - room.baseGuests);
  const left = Math.max(0, room.baseGuests - adults);
  const extraChildren = Math.max(0, paying - left);
  const childRate = room.extraChildPrice ?? room.extraGuestPrice;
  return { counted: adults + paying, paying, extraAdults, extraChildren, childRate, perNight: extraAdults * room.extraGuestPrice + extraChildren * childRate };
}

/** Largest number of adults / children the steppers should allow. */
export function guestLimits(room: Occupancy, adults: number, childAges: number[], freeAge: number) {
  const paying = childAges.filter((a) => a >= freeAge).length;
  const maxAdults = Math.max(1, Math.min(room.maxAdults ?? room.maxGuests, room.maxGuests - paying));
  const maxChildren = room.maxChildren ?? 8;
  return { maxAdults, maxChildren, childrenAllowed: maxChildren > 0 };
}

/** Guest-friendly message if the party doesn't fit the room, otherwise null. */
export function occupancyError(room: Occupancy, adults: number, childAges: number[], freeAge: number): string | null {
  const name = room.name || 'This room';
  const { counted } = guestCharges(room, adults, childAges, freeAge);
  if (adults < 1) return 'At least one adult is needed.';
  if (room.maxChildren === 0 && childAges.length) return `${name} is for adults only.`;
  if (room.maxChildren != null && childAges.length > room.maxChildren) return `${name} allows up to ${room.maxChildren} child${room.maxChildren > 1 ? 'ren' : ''}.`;
  if (room.maxAdults != null && adults > room.maxAdults) return `${name} allows up to ${room.maxAdults} adult${room.maxAdults > 1 ? 's' : ''}.`;
  if (counted > room.maxGuests) return `${name} sleeps up to ${room.maxGuests} guest${room.maxGuests > 1 ? 's' : ''}${freeAge > 0 ? ` (children under ${freeAge} don’t count)` : ''}.`;
  return null;
}

/** One-line description of the room's guest rules, for the booking page. */
export function occupancySummary(room: Occupancy, freeAge: number) {
  const parts: string[] = [];
  if (room.maxGuests <= room.baseGuests) parts.push(`For up to ${room.maxGuests} guest${room.maxGuests > 1 ? 's' : ''}`);
  else {
    parts.push(`Price includes ${room.baseGuests} guest${room.baseGuests > 1 ? 's' : ''}`);
    const child = room.extraChildPrice ?? room.extraGuestPrice;
    if (room.extraGuestPrice || child) {
      parts.push(
        child !== room.extraGuestPrice && room.maxChildren !== 0
          ? `extra adult ${inr(room.extraGuestPrice)}, extra child ${inr(child)} per night`
          : `each extra guest ${inr(room.extraGuestPrice)} per night`,
      );
    }
    parts.push(`up to ${room.maxGuests} guests`);
  }
  if (room.maxAdults != null && room.maxAdults < room.maxGuests) parts.push(`max ${room.maxAdults} adult${room.maxAdults > 1 ? 's' : ''}`);
  if (room.maxChildren === 0) parts.push('adults only');
  else if (freeAge > 0) parts.push(`children under ${freeAge} stay free`);
  return parts.join(' · ');
}
