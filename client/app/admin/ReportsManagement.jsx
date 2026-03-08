'use client'

import { useEffect, useState } from "react"

export default function ReportsManagement() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    fetch("http://localhost:5000/api/v1/resume/logs")
      .then(res => res.json())
      .then(data => setLogs(data))
  }, [])

  const downloadCSV = () => {
    const headers = ["Recruiter", "Candidate", "Generated At"]

    const rows = logs.map((log) => [
      log.recruiterId?.name || "",
      log.candidateId?.name || "",
      new Date(log.generatedAt).toLocaleString()
    ])

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "resume_reports.csv"
    a.click()
  }

  return (
    <div style={{ padding: 30 }}>
      <h1>Resume Reports</h1>

      <button
        onClick={downloadCSV}
        style={{
          marginBottom: 20,
          padding: "10px 20px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 5
        }}
      >
        Download Report
      </button>

      <table border="1" cellPadding="10" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Recruiter</th>
            <th>Candidate</th>
            <th>Generated Date</th>
          </tr>
        </thead>

        <tbody>
          {logs.map((log, index) => (
            <tr key={index}>
              <td>{log.recruiterId?.name}</td>
              <td>{log.candidateId?.name}</td>
              <td>{new Date(log.generatedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}