"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { haversineDistanceMeters } from "@/server/services/routing/straight-line.provider";

export default function TrackSimulatorPage() {
  // Guard in production
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [bookingId, setBookingId] = useState("demo");
  const [helperId, setHelperId] = useState("hlp_demo");
  const [isRunning, setIsRunning] = useState(false);
  const [speedKmh, setSpeedKmh] = useState(22);
  const [statusMsg, setStatusMsg] = useState("Idle. Ready to simulate.");
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentCoord, setCurrentCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const waypointsRef = useRef<[number, number][]>([]);
  const stepIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Default start and destination coordinates (Delhi)
  const destLat = 28.6139;
  const destLng = 77.2090;
  const startLat = 28.6245;
  const startLng = 77.1950;

  // Initialize interpolated waypoints
  const generateWaypoints = useCallback(() => {
    // Distance ~1.8 km. At 22 km/h (6.11 m/s), 2 seconds covers ~12.2 meters per tick.
    const distM = haversineDistanceMeters(
      { lat: startLat, lng: startLng },
      { lat: destLat, lng: destLng }
    );
    const metersPerTick = ((speedKmh * 1000) / 3600) * 2;
    const steps = Math.max(10, Math.round(distM / metersPerTick));

    const points: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      // Add slight road curve
      const curve = Math.sin(ratio * Math.PI) * 0.0025;
      const lat = startLat + (destLat - startLat) * ratio + curve * 0.5;
      const lng = startLng + (destLng - startLng) * ratio + curve;
      points.push([lng, lat]);
    }

    waypointsRef.current = points;
    setTotalSteps(points.length);
    stepIndexRef.current = 0;
    setCurrentStep(0);
    setCurrentCoord({ lat: points[0][1], lng: points[0][0] });
  }, [speedKmh]);

  useEffect(() => {
    generateWaypoints();
  }, [generateWaypoints]);

  const tick = useCallback(async () => {
    const points = waypointsRef.current;
    if (stepIndexRef.current >= points.length) {
      setIsRunning(false);
      setStatusMsg("Simulation complete! Helper arrived at customer.");
      return;
    }

    const [lng, lat] = points[stepIndexRef.current];
    setCurrentCoord({ lat, lng });
    setCurrentStep(stepIndexRef.current + 1);

    // Calculate heading to next point
    let heading: number | null = null;
    if (stepIndexRef.current < points.length - 1) {
      const next = points[stepIndexRef.current + 1];
      const dLng = next[0] - lng;
      const dLat = next[1] - lat;
      heading = Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI);
      if (heading < 0) heading += 360;
    }

    const payload = {
      lat,
      lng,
      accuracy_m: 8,
      heading_deg: heading,
      speed_mps: Math.round(((speedKmh * 1000) / 3600) * 10) / 10,
      recorded_at: new Date().toISOString(),
    };

    try {
      const res = await fetch(`/api/helper/location?bookingId=${encodeURIComponent(bookingId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-helper-id": helperId,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setLastResponse({ status: res.status, data });

      if (res.ok) {
        setStatusMsg(`Ping ${stepIndexRef.current + 1}/${points.length} sent: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } else {
        setStatusMsg(`Warning: Server returned ${res.status} (${data.error || "Error"})`);
      }
    } catch (err: any) {
      setStatusMsg(`Fetch error: ${err.message}`);
    }

    stepIndexRef.current++;
    timerRef.current = setTimeout(tick, 2000); // 1 point every 2 seconds
  }, [bookingId, helperId, speedKmh]);

  const handleStart = () => {
    if (isRunning) return;
    setIsRunning(true);
    setStatusMsg("Simulation running: sending live pings every 2s...");
    tick();
  };

  const handleStop = () => {
    setIsRunning(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatusMsg("Simulation paused.");
  };

  const handleReset = () => {
    handleStop();
    generateWaypoints();
    setStatusMsg("Reset to start position.");
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] p-6 text-[#2A1F24] font-sans max-w-2xl mx-auto">
      <header className="mb-6 border-b border-[#E8E2D9] pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#D9507F]">Swepy Live Tracking Simulator</h1>
            <p className="text-sm text-[#736B6E] mt-1">Dev-only tool to test 2-window desktop tracking</p>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-[#FDE8EF] text-[#D9507F]">
            DEV ONLY
          </span>
        </div>
      </header>

      {/* INSTRUCTIONS */}
      <div className="bg-white p-4 rounded-xl border border-[#E8E2D9] shadow-sm mb-6">
        <h2 className="text-sm font-semibold mb-2">How to test with two desktop windows:</h2>
        <ol className="text-xs text-[#736B6E] space-y-1 list-decimal list-inside leading-relaxed">
          <li>Keep this tab open as the <strong>Simulator</strong>.</li>
          <li>
            Open{" "}
            <Link href="/booking/demo" target="_blank" className="text-[#D9507F] underline font-medium">
              /booking/demo
            </Link>{" "}
            in a separate window to watch the customer tracking map in real time.
          </li>
          <li>
            Open{" "}
            <Link href="/helper/orders" target="_blank" className="text-[#D9507F] underline font-medium">
              /helper/orders
            </Link>{" "}
            in another window to verify the helper home map and active job card.
          </li>
          <li>Click <strong>Start Simulation</strong> below to start driving the helper at 22 km/h!</li>
          <li>
            <em>Tip:</em> You can also test native browser GPS simulation via <strong>Chrome DevTools &gt; Sensors &gt; Location</strong>.
          </li>
        </ol>
      </div>

      {/* CONTROLS */}
      <div className="bg-white p-5 rounded-xl border border-[#E8E2D9] shadow-sm mb-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#736B6E] mb-1">Booking ID</label>
            <input
              type="text"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="w-full h-10 px-3 border border-[#E8E2D9] rounded-lg text-sm font-mono outline-none focus:border-[#D9507F]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#736B6E] mb-1">Helper ID</label>
            <input
              type="text"
              value={helperId}
              onChange={(e) => setHelperId(e.target.value)}
              className="w-full h-10 px-3 border border-[#E8E2D9] rounded-lg text-sm font-mono outline-none focus:border-[#D9507F]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#736B6E] mb-1">
            Simulated Speed: {speedKmh} km/h (~{Math.round(((speedKmh * 1000) / 3600) * 2)}m every 2s)
          </label>
          <input
            type="range"
            min="10"
            max="60"
            value={speedKmh}
            disabled={isRunning}
            onChange={(e) => setSpeedKmh(Number(e.target.value))}
            className="w-full accent-[#D9507F]"
          />
        </div>

        {/* BUTTONS */}
        <div className="flex gap-3 pt-2">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="flex-1 h-11 bg-[#D9507F] text-white font-medium rounded-lg text-sm shadow hover:bg-[#c2406d] transition-colors cursor-pointer"
            >
              Start Simulation
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex-1 h-11 bg-[#E2A03F] text-white font-medium rounded-lg text-sm shadow hover:bg-[#cf8e30] transition-colors cursor-pointer"
            >
              Pause
            </button>
          )}
          <button
            onClick={handleReset}
            className="px-4 h-11 border border-[#E8E2D9] bg-white text-ink font-medium rounded-lg text-sm hover:bg-[#FAF7F2] transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* STATUS & TELEMETRY */}
      <div className="bg-white p-5 rounded-xl border border-[#E8E2D9] shadow-sm space-y-3">
        <h3 className="text-sm font-semibold">Live Telemetry</h3>
        <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E8E2D9] text-xs font-mono text-ink">
          {statusMsg}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
            <span className="text-gray-500 block">Progress</span>
            <span className="font-semibold text-gray-800">
              {currentStep} / {totalSteps} ticks ({totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0}%)
            </span>
          </div>
          <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
            <span className="text-gray-500 block">Current Coordinate</span>
            <span className="font-semibold font-mono text-gray-800">
              {currentCoord ? `${currentCoord.lat.toFixed(4)}, ${currentCoord.lng.toFixed(4)}` : "—"}
            </span>
          </div>
        </div>

        {lastResponse && (
          <div className="mt-2 text-[11px] font-mono text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-200">
            HTTP {lastResponse.status}: {JSON.stringify(lastResponse.data)}
          </div>
        )}
      </div>
    </div>
  );
}
