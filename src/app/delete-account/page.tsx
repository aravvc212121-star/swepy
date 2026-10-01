import AppShell from "@/components/app-shell";
import Footer from "@/components/footer";
import BottomNav from "@/components/bottom-nav";

export default function DeleteAccountPage() {
  return (
    <>
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
          <h1 className="text-xl font-medium text-ink mb-2">Delete Account</h1>
          <p className="text-ink-muted text-sm mb-6">If you wish to delete your account and all associated data, please contact our support team.</p>
          <a href="mailto:help@swepy.in" className="px-6 py-3 bg-brand-rose text-white rounded-[12px] font-medium text-sm">
            Request Account Deletion
          </a>
        </div>
      </AppShell>
      <Footer />
      <BottomNav />
    </>
  );
}
