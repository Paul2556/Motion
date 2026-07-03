import { useEffect, useState } from "react";
import ConferenceService from "../services/ConferenceService";
import ExcelJS from "exceljs";
import SpreadsheetAnalyzer from "../services/SpreadsheetAnalyzer";

export default function DebugPage() {
  const [conference, setConference] = useState(null);
  const [committees, setCommittees] = useState([]);
  const [delegates, setDelegates] = useState([]);
  const [selectedCommittee, setSelectedCommittee] = useState("");
  const [analysis, setAnalysis] = useState([]);

  async function loadConference(event) {
    const file = event.target.files?.[0];
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(
      await file.arrayBuffer()
    );

    const analyzedSheets = [];

    workbook.eachSheet((worksheet) => {
      const analyzer = new SpreadsheetAnalyzer(
        worksheet
      );

      analyzedSheets.push({
        sheet: worksheet.name,
        tables: analyzer.analyze(),
      });
    });

    setAnalysis(analyzedSheets);

    if (!file) return;

    try {
      const data = await ConferenceService.loadConference(file);

      setConference(data);

      const loadedCommittees =
        ConferenceService.getCommittees();

      setCommittees(loadedCommittees);

      if (loadedCommittees.length > 0) {
        const first = loadedCommittees[0];

        setSelectedCommittee(first.id);

        ConferenceService.setActiveCommittee(first.id);

        setDelegates(
          ConferenceService.getDelegates()
        );
      }
    } catch (error) {
      console.error(error);

      alert("Failed to load workbook.");
    }
  }

  useEffect(() => {
    if (!selectedCommittee) return;

    ConferenceService.setActiveCommittee(
      selectedCommittee
    );

    setDelegates(
      ConferenceService.getDelegates()
    );
  }, [selectedCommittee]);

  function resetConference() {
    ConferenceService.reset();

    setConference(null);
    setCommittees([]);
    setDelegates([]);
    setSelectedCommittee("");
  }

  function dumpJSON() {
    console.log(
      ConferenceService.getConference()
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] p-8 text-white">

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
                  setSelectedCommittee(
                    e.target.value
                  )
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
                        {delegate.country}
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
          
          {/* Spreadsheet Analyzer */}

          <div className="border border-white/10 bg-[#111111] p-6 lg:col-span-2">

            <h2 className="text-xl font-semibold">
              Spreadsheet Analyzer
            </h2>

            <div className="mt-6 space-y-6">

              {analysis.map((sheet) => (

                <div
                  key={sheet.sheet}
                  className="border border-white/10 p-4"
                >

                  <h3 className="font-semibold">
                    {sheet.sheet}
                  </h3>

                  <p className="mt-2 text-sm text-white/50">
                    {sheet.tables.length} tables found
                  </p>

                  {sheet.tables.map((table, index) => (

                    <div
                      key={index}
                      className="mt-4 rounded border border-white/10 bg-[#181818] p-3"
                    >

                      <p><strong>Top:</strong> {table.top}</p>
                      <p><strong>Left:</strong> {table.left}</p>
                      <p><strong>Bottom:</strong> {table.bottom}</p>
                      <p><strong>Right:</strong> {table.right}</p>

                      <div className="mt-4 overflow-x-auto">

                        <table className="border-collapse text-sm">

                          <tbody>

                            {table.cells.map((row, rowIndex) => (

                              <tr key={rowIndex}>

                                {row.map((cell, cellIndex) => (

                                  <td
                                    key={cellIndex}
                                    className="border border-white/10 px-2 py-1"
                                  >
                                    {cell || " "}
                                  </td>

                                ))}

                              </tr>

                            ))}

                          </tbody>

                        </table>

                      </div>

                    </div>

                  ))}

                </div>

              ))}

            </div>

          </div>
          
          {/* Live JSON */}

          <div className="border border-white/10 bg-[#111111] p-6 lg:col-span-2">

            <h2 className="text-xl font-semibold">
              Conference Object
            </h2>

            <div className="mt-4 overflow-x-auto">

  <table className="border-collapse text-sm">

    <tbody>

      {table.cells.map((row, rowIndex) => (

        <tr key={rowIndex}>

          {row.map((cell, cellIndex) => (

            <td
              key={cellIndex}
              className="border border-white/10 px-2 py-1"
            >
              {cell || " "}
            </td>

          ))}

        </tr>

      ))}

    </tbody>

  </table>

</div>

          </div>

        </div>

      </div>

    </div>
  );
}