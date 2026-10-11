export default function AIChatButton({ open, onClick }) {
  if (open) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40 inline-flex min-h-14 items-center gap-2 rounded-full px-4 text-white shadow-xl transition hover:brightness-95 focus-visible:outline-offset-4 sm:bottom-6 sm:right-6"
      style={{ backgroundColor: '#075A9F' }}
      aria-label="Open KIMS AI Assistant"
      aria-haspopup="dialog"
    >
      <span className="text-xl" aria-hidden="true">✦</span>
      <span className="text-sm font-bold">Ask KIMS AI</span>
    </button>
  );
}
