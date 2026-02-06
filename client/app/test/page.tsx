export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-xl shadow">
        <h1 className="text-3xl font-bold text-green-600 mb-4">✅ Success!</h1>
        <p className="text-xl text-gray-700">Frontend is working on port 3000</p>
        <div className="mt-6 space-y-3">
          <a href="/auth/login" className="block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Go to Login Page
          </a>
          <a href="/admin" className="block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Go to Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}