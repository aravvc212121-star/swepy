import { BookingRepository } from '../repositories/booking.repository';
import { HelperRepository } from '../repositories/helper.repository';
import type { RealtimeGateway } from '../lib/interfaces';

import * as h3 from 'h3-js';

// Simple haversine implementation if not fully exposed
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; 
}

export class DispatchService {
  constructor(
    private readonly bookingRepo: BookingRepository,
    private readonly helperRepo: HelperRepository,
    private readonly realtime: RealtimeGateway
  ) {}

  async dispatchWave(bookingId: string, lat: number, lng: number, cityId: string, wave: number): Promise<void> {
    // 1. Get all eligible helpers
    const onlineHelpers = await this.helperRepo.getOnlineHelpersInCity(cityId);
    
    // filter helpers not already offered, not on another job... 
    // For now, simplify and just rank by distance
    const withDistance = onlineHelpers.map(h => ({
      ...h,
      distance: getDistance(lat, lng, h.last_lat, h.last_lng)
    }));

    // Sort by nearest
    withDistance.sort((a, b) => a.distance - b.distance);

    // Pick top 3 for this wave
    const waveSize = 3;
    const startIndex = (wave - 1) * waveSize;
    const selected = withDistance.slice(startIndex, startIndex + waveSize);

    if (selected.length === 0) {
      if (wave === 1) {
        // No helpers at all
        await this.bookingRepo.updateBookingStatus(bookingId, 'no_helper_found');
      } else {
        // Waves exhausted
        await this.bookingRepo.updateBookingStatus(bookingId, 'no_helper_found');
      }
      return;
    }

    const helperIds = selected.map(h => h.user_id);
    await this.bookingRepo.createOffers(bookingId, wave, helperIds);

    // Notify helpers
    for (const helper of selected) {
      await this.realtime.publish(`helper:${helper.user_id}`, 'new_offer', {
        bookingId,
        distance: helper.distance
      });
    }
  }

  async acceptOffer(bookingId: string, helperId: string): Promise<void> {
    await this.bookingRepo.acceptOffer(bookingId, helperId);
    // Realtime notification to customer handled by outbox or realtime service later
  }

  async rejectOffer(bookingId: string, helperId: string, reason?: string): Promise<void> {
    await this.bookingRepo.rejectOffer(bookingId, helperId, reason);
    
    // Check if wave is exhausted, if so, trigger next wave
    const pending = await this.bookingRepo.findPendingOffers(bookingId);
    if (pending.length === 0) {
      // All rejected or expired
      const booking = await this.bookingRepo.getBooking(bookingId);
      if (booking && booking.status === 'searching') {
        const nextWave = booking.dispatch_wave + 1;
        if (nextWave <= 3) {
           await this.bookingRepo.updateBookingStatus(bookingId, 'searching'); // update wave if we added column, skipping for now
           // For full implementation, we'd store wave in booking and increment
           await this.dispatchWave(bookingId, booking.address_snapshot.lat, booking.address_snapshot.lng, booking.address_snapshot.city_id, nextWave);
        } else {
           await this.bookingRepo.updateBookingStatus(bookingId, 'no_helper_found');
        }
      }
    }
  }
}
