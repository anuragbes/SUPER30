import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import eyeopen from "@/assets/eye-open.svg";
import eyeclosed from "@/assets/eye-closed.svg";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const backendURL = import.meta.env.VITE_BACKEND_URL;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        `${backendURL}/api/admin/login`,
        formData
      );

      toast.success("Login Successful!");

      // Save token
      localStorage.setItem("adminToken", res.data.token);

      navigate("/admin/dashboard");
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.error || "Login failed");
    }

    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-xl p-10 w-[380px] flex flex-col gap-6"
      >
        <h2 className="text-3xl text-center font-semibold pb-2">Admin Login</h2>

        <Input
          type="text"
          name="username"
          placeholder="Username"
          onChange={handleChange}
          required
          className="rounded-lg p-3"
        />

        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            onChange={handleChange}
            required
            className="rounded-lg p-3 w-full pr-12"
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <img
              src={showPassword ? eyeopen : eyeclosed}
              alt="toggle visibility"
              className="w-5 h-5"
            />
          </Button>
        </div>

        <Button
          disabled={loading}
          type="submit"
          className="w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Spinner /> Logging in...
            </>
          ) : (
            "Login"
          )}
        </Button>
      </form>
    </div>
  );
}
