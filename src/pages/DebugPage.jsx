import { useState } from "react";
import ConferenceService from "../services/ConferenceService";
import AllocationParser from "../services/AllocationParser";

export default function DebugPage() {
  const [conference, setConference] = useState(null);
  const [committees, setCommittees] = useState([]);
  const [delegates, setDelegates] = useState([]);
  const [selectedCommittee, setSelectedCommittee] = useState("");
  const [parsedCommittees, setParsedCommittees] = useState([]);

  async function loadConference(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parser = new AllocationParser();
      const parsed = await parser.load(file);

      setParsedCommittees(parsed.committees);
    } catch (error) {
      console.error(error);
    }

    try {
      const data = await ConferenceService.loadConference(file);

      setConference(data);

      const loadedCommittees =
        ConferenceService.getCommittees();

      setCommittees(loadedCommittees);

      if (loadedCommittees.length > 0) {
        selectCommittee(loadedCommittees[0].id);
      }
    } catch (error) {
      console.error(error);

      alert("Failed to load workbook.");
    }
  }

  function selectCommittee(id) {
    setSelectedCommittee(id);

    ConferenceService.setActiveCommittee(id);

    setDelegates(
      ConferenceService.getDelegates()
    );
  }

  function resetConference() {
    ConferenceService.reset();

    setConference(null);
    setCommittees([]);
    setDelegates([]);
    setSelectedCommittee("");
    setParsedCommittees([]);
  }

  function dumpJSON() {
    console.log(
      ConferenceService.getConference()
    );
  }

  return (
    <div className="app-shell min-h-screen bg-[#0d0d0d] p-8 text-white">

      <div className="mx-auto max-w-7xl">

        <h1 className="text-4xl font-semibold">
          Motion Debug
        </h1>

        <p className="mt-2 text-white/40">
          ConferenceService Debugger
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">

          {/* Conference */}

          <div className="border border-white/10 bg-[#111111] p-6">

            <h2 className="text-xl font-semibold">
              Conference
            </h2>

            <div className="mt-6 space-y-4">

              <input
                type="file"
                accept=".xlsx"
                onChange={loadConference}
                className="block w-full border border-white/10 bg-[#181818] p-3"
              />

              <div>

                <p className="text-white/50">
                  Loaded
                </p>

                <p>
                  {ConferenceService.isLoaded()
                    ? "✅ Yes"
                    : "❌ No"}
                </p>

              </div>

              <div>

                <p className="text-white/50">
                  Conference Name
                </p>

                <p>
                  {conference?.name ?? "-"}
                </p>

              </div>

              <div>

                <p className="text-white/50">
                  Committees
                </p>

                <p>
                  {committees.length}
                </p>

              </div>

            </div>

          </div>

          {/* Committee */}

          <div className="border border-white/10 bg-[#111111] p-6">

            <h2 className="text-xl font-semibold">
              Committee
            </h2>

            <div className="mt-6">

              <select
                value={selectedCommittee}
                onChange={(e) =>
                  selectCommittee(e.target.value)
                }
                className="w-full border border-white/10 bg-[#181818] p-3"
              >
                {committees.map((committee) => (
                  <option
                    key={committee.id}
                    value={committee.id}
                  >
                    {committee.committee}
                  </option>
                ))}
              </select>

            </div>

            <div className="mt-6 space-y-4">

              <div>

                <p className="text-white/50">
                  Active Committee
                </p>

                <p>
                  {selectedCommittee || "-"}
                </p>

              </div>

              <div>

                <p className="text-white/50">
                  Delegates
                </p>

                <p>
                  {delegates.length}
                </p>

              </div>

            </div>

          </div>
                    {/* Delegates */}

          <div className="border border-white/10 bg-[#111111] p-6 lg:col-span-2">

            <div className="flex items-center justify-between">

              <h2 className="text-xl font-semibold">
                Delegates
              </h2>

              <span className="text-sm text-white/40">
                {delegates.length} loaded
              </span>

            </div>

            <div className="mt-6 max-h-[400px] overflow-y-auto border border-white/10">

              <table className="w-full border-collapse">

                <thead className="sticky top-0 bg-[#181818]">

                  <tr>

                    <th className="border-b border-white/10 p-3 text-left">
                      #
                    </th>

                    <th className="border-b border-white/10 p-3 text-left">
                      Country
                    </th>

                    <th className="border-b border-white/10 p-3 text-left">
                      Delegate
                    </th>

                    <th className="border-b border-white/10 p-3 text-left">
                      Present
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {delegates.map((delegate, index) => (

                    <tr
                      key={delegate.id}
                      className="border-b border-white/5 hover:bg-white/5"
                    >

                      <td className="p-3">
                        {index + 1}
                      </td>

                      <td className="p-3">
                        {delegate.countryDisplay}
                      </td>

                      <td className="p-3">
                        {delegate.delegate}
                      </td>

                      <td className="p-3">
                        {delegate.present ? "✅" : "❌"}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

          {/* Statistics */}

          <div className="border border-white/10 bg-[#111111] p-6">

            <h2 className="text-xl font-semibold">
              Statistics
            </h2>

            <div className="mt-6 space-y-3">

              {ConferenceService.isLoaded() && (() => {
                const stats =
                  ConferenceService.getStatistics();

                return (
                  <>
                    <p>
                      Delegates: {stats.delegates}
                    </p>

                    <p>
                      Present: {stats.present}
                    </p>

                    <p>
                      Spoken: {stats.spoken}
                    </p>

                    <p>
                      Total Speaking Time:{" "}
                      {stats.totalSpeakingTime}s
                    </p>
                  </>
                );
              })()}

            </div>

          </div>

          {/* Tools */}

          <div className="border border-white/10 bg-[#111111] p-6">

            <h2 className="text-xl font-semibold">
              Tools
            </h2>

            <div className="mt-6 flex flex-wrap gap-3">

              <button
                onClick={dumpJSON}
                className="border border-white/10 px-5 py-3 hover:bg-white/10"
              >
                Console Log
              </button>

              <button
                onClick={() =>
                  console.log(
                    JSON.stringify(
                      ConferenceService.getConference(),
                      null,
                      2
                    )
                  )
                }
                className="border border-white/10 px-5 py-3 hover:bg-white/10"
              >
                Dump JSON
              </button>

              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    JSON.stringify(
                      ConferenceService.getConference(),
                      null,
                      2
                    )
                  )
                }
                className="border border-white/10 px-5 py-3 hover:bg-white/10"
              >
                Copy JSON
              </button>

              <button
                onClick={resetConference}
                className="border border-red-500/40 px-5 py-3 text-red-400 hover:bg-red-500/10"
              >
                Reset Conference
              </button>

            </div>

          </div>
          
          {/* Allocation Parser */}

          <div className="border border-white/10 bg-[#111111] p-6 lg:col-span-2">

            <h2 className="text-xl font-semibold">
              Allocation Parser
            </h2>

            <p className="mt-2 text-sm text-white/40">
              Raw output of AllocationParser, shown alongside ConferenceService's
              own parse above for comparison.
            </p>

            <div className="mt-6 space-y-6">

              {parsedCommittees.map((committee) => (

                <div
                  key={committee.id}
                  className="border border-white/10 p-4"
                >

                  <h3 className="font-semibold">
                    {committee.id}
                    {committee.title ? ` — ${committee.title}` : ""}
                  </h3>

                  <p className="mt-1 text-sm text-white/50">
                    {committee.topic || "(no topic)"}
                  </p>

                  <p className="mt-2 text-sm text-white/50">
                    {committee.chairs.length} chairs ·{" "}
                    {committee.delegates.length} delegates ·{" "}
                    {committee.pages.length} pages
                  </p>

                  <div className="mt-4 overflow-x-auto">

                    <table className="border-collapse text-sm">

                      <thead>

                        <tr>
                          <th className="border border-white/10 px-2 py-1 text-left">Role</th>
                          <th className="border border-white/10 px-2 py-1 text-left">Country</th>
                          <th className="border border-white/10 px-2 py-1 text-left">Code</th>
                          <th className="border border-white/10 px-2 py-1 text-left">Name</th>
                          <th className="border border-white/10 px-2 py-1 text-left">School</th>
                          <th className="border border-white/10 px-2 py-1 text-left">Stance</th>
                        </tr>

                      </thead>

                      <tbody>

                        {[...committee.chairs, ...committee.delegates, ...committee.pages].map((person, index) => (

                          <tr key={index}>
                            <td className="border border-white/10 px-2 py-1">{person.role || ""}</td>
                            <td className="border border-white/10 px-2 py-1">{person.countryDisplay || ""}</td>
                            <td className="border border-white/10 px-2 py-1">{person.countryCode || ""}</td>
                            <td className="border border-white/10 px-2 py-1">{person.name || ""}</td>
                            <td className="border border-white/10 px-2 py-1">{person.school || ""}</td>
                            <td className="border border-white/10 px-2 py-1">{person.stance || ""}</td>
                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                </div>

              ))}

            </div>

          </div>

          {/* Live JSON */}

          <div className="border border-white/10 bg-[#111111] p-6 lg:col-span-2">

            <h2 className="text-xl font-semibold">
              Conference Object
            </h2>

            <pre className="mt-4 max-h-[400px] overflow-auto border border-white/10 bg-[#181818] p-3 text-xs">
              {JSON.stringify(conference, null, 2)}
            </pre>

          </div>

        </div>

      </div>

    </div>
  );
}