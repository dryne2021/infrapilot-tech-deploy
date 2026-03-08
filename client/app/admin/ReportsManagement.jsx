"use client"

import { useEffect, useState } from "react"

export default function ReportsManagement() {

const [report,setReport] = useState({
totalResumes:0,
topRecruiter:"-",
topCandidate:"-",
logs:[]
})

const [loading,setLoading] = useState(true)

const API_URL = "https://infrapilot-tech-deploy.onrender.com"

useEffect(()=>{
fetchReports()
},[])

async function fetchReports(){

try{

const res = await fetch(`${API_URL}/api/v1/resume/logs`)
const data = await res.json()

setReport(data)
setLoading(false)

}catch(err){

console.error("Failed to fetch report:",err)
setLoading(false)

}

}

function downloadCSV(){

let csv = "Recruiter,Candidate,Resumes Generated,Generated Date\n"

report.logs.forEach(log=>{
csv += `${log.recruiter},${log.candidate},${log.totalResumes},${new Date(log.generatedAt).toLocaleString()}\n`
})

const blob = new Blob([csv],{type:"text/csv"})
const url = window.URL.createObjectURL(blob)

const a = document.createElement("a")
a.href = url
a.download = "resume-report.csv"
a.click()

}

if(loading){
return(
<div className="p-6">
Loading reports...
</div>
)
}

return(

<div className="p-6">

{/* TITLE */}

<h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
📄 Resume Generation Reports
</h2>

{/* ANALYTICS CARDS */}

<div className="grid grid-cols-3 gap-6 mb-8">

<div className="bg-white p-5 rounded-lg shadow">
<p className="text-gray-500 text-sm">Total Resumes Today</p>
<p className="text-2xl font-bold text-indigo-600">
{report.totalResumes}
</p>
</div>

<div className="bg-white p-5 rounded-lg shadow">
<p className="text-gray-500 text-sm">Top Recruiter</p>
<p className="text-lg font-semibold">
{report.topRecruiter}
</p>
</div>

<div className="bg-white p-5 rounded-lg shadow">
<p className="text-gray-500 text-sm">Top Candidate</p>
<p className="text-lg font-semibold">
{report.topCandidate}
</p>
</div>

</div>

{/* REPORT TABLE */}

<div className="bg-white rounded-lg shadow p-4">

<div className="flex justify-between items-center mb-4">

<h3 className="font-semibold">
Resume Generation Logs
</h3>

<button
onClick={downloadCSV}
className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
>
Download CSV
</button>

</div>

<table className="w-full text-sm">

<thead>

<tr className="text-left text-gray-500 border-b">

<th className="p-3">Recruiter</th>

<th className="p-3">Candidate</th>

<th className="p-3">Resumes Generated</th>

<th className="p-3">Last Generated</th>

</tr>

</thead>

<tbody>

{report.logs.map((log,index)=>(
<tr
key={index}
className="border-b hover:bg-gray-50"
>

<td className="p-3 font-medium text-gray-800">
{log.recruiter}
</td>

<td className="p-3 text-gray-600">
{log.candidate}
</td>

<td className="p-3 font-bold text-indigo-600">
{log.totalResumes}
</td>

<td className="p-3 text-indigo-600">
{new Date(log.generatedAt).toLocaleString()}
</td>

</tr>
))}

</tbody>

</table>

</div>

</div>

)

}