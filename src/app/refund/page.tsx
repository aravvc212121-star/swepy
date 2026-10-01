import AppShell from "@/components/app-shell";
import Footer from "@/components/footer";
import BottomNav from "@/components/bottom-nav";

export default function RefundPage() {
  return (
    <>
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
          <h1 className="text-xl font-medium text-ink mb-2">Refund policy</h1>
          <p className="text-ink-muted text-sm">Coming soon. We're working on this page.</p>
        </div>
      </AppShell>
      <Footer />
      <BottomNav />
    </>
  );
}
