import { useNavigate } from "react-router-dom";

export default function NoCommitteeModal() {
  const navigate = useNavigate();

  // This is often a page's entire render (see SessionPage.jsx's guard
  // comment), so it needs its own .app-shell wrapper - without one, no
  // .app-shell ever mounts and the light theme's CSS never matches, leaving
  // this stuck on the dark palette regardless of the chair's actual setting.
  return (
    <div className="app-shell fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-sm border border-white/10 bg-[#111111] p-6 text-center text-white">
        <p className="text-lg font-medium">No committee is loaded</p>
        <p className="mt-2 text-sm text-white/45">Load a conference workbook first.</p>

        <button
          onClick={() => navigate("/home")}
          className="mt-5 w-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/10"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
