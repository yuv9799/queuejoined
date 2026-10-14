import TokenKiosk from '../TokenKiosk.jsx';

// Mobile "Generate Token" screen: reuses the existing kiosk form unchanged
// (same validation, API call and result view), just without the marketing copy.
export default function MobileKiosk() {
  return (
    <div>
      <h1 className="mb-2 text-lg font-extrabold" style={{ color: '#102A43' }}>Generate Token</h1>
      <div className="rounded-2xl border bg-white p-3.5" style={{ borderColor: '#E1EAF2' }}>
        <TokenKiosk />
      </div>
    </div>
  );
}
