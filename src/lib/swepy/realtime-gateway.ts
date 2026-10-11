export interface LiveBookingUpdate {
  booking_status: string;
  helper?: {
    lat: number;
    lng: number;
    heading_deg: number | null;
    accuracy_m: number;
    updated_at: string;
    stale: boolean;
  } | null;
  destination?: {
    lat: number;
    lng: number;
  };
  route?: {
    geometry: {
      type: "LineString";
      coordinates: [number, number][];
    };
    distance_m: number;
    duration_s: number;
    source: "ors" | "straight_line";
  } | null;
  eta_minutes?: number;
  distance_m?: number;
  server_time: string;
}

export interface RealtimeGateway {
  subscribe(
    bookingId: string,
    onUpdate: (data: LiveBookingUpdate) => void,
    onError?: (err: Error) => void
  ): () => void;
}

export class PollingGateway implements RealtimeGateway {
  private defaultIntervalMs = 3000;

  subscribe(
    bookingId: string,
    onUpdate: (data: LiveBookingUpdate) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (typeof window === "undefined") return () => {};

    let isSubscribed = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let currentInterval = this.defaultIntervalMs;
    let lastEtag: string | null = null;
    let isFetching = false;

    const poll = async () => {
      if (!isSubscribed || isFetching) return;
      if (document.hidden) return; // Pause polling when tab is not visible

      isFetching = true;
      try {
        const headers: Record<string, string> = {};
        if (lastEtag) {
          headers["If-None-Match"] = lastEtag;
        }

        const res = await fetch(`/api/bookings/${bookingId}/live`, {
          headers,
          cache: "no-store",
        });

        if (res.status === 304) {
          // Unchanged poll - maintain normal interval, no re-render needed
          currentInterval = this.defaultIntervalMs;
        } else if (res.ok) {
          const etag = res.headers.get("ETag");
          if (etag) lastEtag = etag;

          const data: LiveBookingUpdate = await res.json();
          if (isSubscribed) {
            onUpdate(data);
            currentInterval = this.defaultIntervalMs;

            // Stop polling if booking is outside the live sharing window
            const status = data.booking_status;
            if (["in_progress", "completed", "cancelled", "expired"].includes(status)) {
              isSubscribed = false;
              return;
            }
          }
        } else {
          // Non-OK status - back off up to 15s
          currentInterval = Math.min(15000, currentInterval * 1.5);
          onError?.(new Error(`Polling error: ${res.status}`));
        }
      } catch (err: any) {
        // Network failure - back off up to 15s
        currentInterval = Math.min(15000, currentInterval * 1.5);
        onError?.(err);
      } finally {
        isFetching = false;
        if (isSubscribed) {
          timer = setTimeout(poll, currentInterval);
        }
      }
    };

    // Immediate first fetch
    poll();

    // Visibility change handler: pause when hidden, resume immediately when visible
    const handleVisibilityChange = () => {
      if (!isSubscribed) return;
      if (!document.hidden) {
        if (timer) clearTimeout(timer);
        currentInterval = this.defaultIntervalMs;
        poll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isSubscribed = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }
}

// Global default gateway
export const realtimeGateway: RealtimeGateway = new PollingGateway();
