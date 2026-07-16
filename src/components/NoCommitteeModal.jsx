import { useNavigate } from "react-router-dom";

export default function NoCommitteeModal() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
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
