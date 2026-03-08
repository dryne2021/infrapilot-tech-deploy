'use client'

import { useEffect, useState } from "react"

export default function ReportsManagement() {

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // Load resume logs
  useEffect(() => {
    fetch("https://infrapilot-tech-deploy.onrender.com/api/v1/resume/logs")
      .then(res => res.json())
      .then(data => {
        setLogs(Array.isArray(data) ? data : data?.data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch resume logs:", err)
        setLoading(false)
      })
  }, [])

  // Download CSV
  const downloadCSV = () => {

    const headers = ["Recruiter", "Candidate", "Generated Date"]

    const rows = logs.map((log) => [
      `${log.recruiterId?.firstName || ""} ${log.recruiterId?.lastName || ""}`,
      log.candidateId?.fullName || "",
      new Date(log.generatedAt).toLocaleString()
    ])

    const csv = [headers, ...rows]
      .map(row => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "resume_reports.csv"
    a.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">
          📄 Resume Generation Reports
        </h2>

        <button
          onClick={downloadCSV}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-md"
        >
          Download CSV
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading reports...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-500">No reports available</p>
      ) : (

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-gray-50">

              <tr>
                <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Recruiter
                </th>

                <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Candidate
                </th>

                <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Generated Date
                </th>
              </tr>

            </thead>

            <tbody className="divide-y divide-gray-200">

              {logs.map((log, index) => (

                <tr key={index} className="hover:bg-gray-50">

                  <td className="p-3 font-semibold text-gray-800">
                    {log.recruiterId
                      ? `${log.recruiterId.firstName || ""} ${log.recruiterId.lastName || ""}`
                      : "—"}
                  </td>

                  <td className="p-3 text-gray-600">
                    {log.candidateId?.fullName || "—"}
                  </td>

                  <td className="p-3 text-indigo-600 font-semibold">
                    {new Date(log.generatedAt).toLocaleString()}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>
  )
}