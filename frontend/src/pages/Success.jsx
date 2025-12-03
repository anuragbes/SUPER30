import { useParams, Link, useLocation } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Success() {
  const { studentId } = useParams();
  const location = useLocation();

  // studentName was passed via navigate state
  const studentName = location.state?.studentName;

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 px-4">
      <div className="bg-white shadow-lg rounded-xl p-8 text-center w-full max-w-md">

        <CheckCircle className="text-green-600 mx-auto mb-4" size={60} />

        <h1 className="text-2xl font-bold text-green-700">Registration Successful!</h1>

        <p className="text-lg mt-4 font-medium">
          Student Registered: <span className="font-bold">{studentName}</span>
        </p>

        <p className="text-xl mt-2 mb-8 font-semibold">
          Student ID: <span className="text-blue-600 font-mono">{studentId}</span>
        </p>

        <Link to="/">
          <Button className="w-full">Go to Home Page</Button>
        </Link>

      </div>
    </div>
  );
}
