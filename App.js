import React, { useState } from "react";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login Attempt:", { email, password });
  };

  return (
    <div className="min-h-screen bg-[#fbfbfd] font-sans antialiased text-[#1d1d1f]">
      {/* 1. Minimalist Navbar - Sadece Logo */}
      <nav className="w-full bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 py-5 px-8">
        <div className="max-w-7xl mx-auto flex justify-center">
          <div className="text-xl font-bold tracking-tight text-[#1d1d1f]">
            ASTRA<span className="text-gray-400 font-light">TECH</span>
          </div>
        </div>
      </nav>

      {/* 2. Main Section */}
      <main className="flex flex-col items-center justify-center pt-24 px-4">
        <div className="max-w-[400px] w-full bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-12 border border-gray-50">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-semibold tracking-tight">Sign In</h2>
            <p className="text-sm text-gray-400 mt-3 font-medium tracking-tight">
              Manage your orders and preferences
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <input
                type="email"
                required
                className="block w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-[15px] placeholder-gray-400"
                placeholder="Email address"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="block w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-[15px] placeholder-gray-400"
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400 hover:text-black uppercase tracking-widest"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="flex justify-end pr-2">
              <a
                href="#"
                className="text-xs text-gray-400 hover:text-black transition-colors font-medium"
              >
                Forgot your password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full py-4 px-6 rounded-2xl shadow-sm text-sm font-semibold text-white bg-[#1d1d1f] hover:bg-black transition-all duration-300 transform active:scale-[0.98] mt-4"
            >
              Continue
            </button>
          </form>

          {/* Create Account Area */}
          <div className="mt-10 text-center">
            <p className="text-[13px] text-gray-400 font-medium">
              New to AstraTech?
              <a
                href="#"
                className="ml-2 text-black hover:underline font-bold decoration-1 underline-offset-4"
              >
                Create your ID
              </a>
            </p>
          </div>
        </div>

        {/* Simple Footer */}
        <div className="mt-20 flex space-x-6 text-[11px] font-medium text-gray-400 uppercase tracking-widest">
          <span>Privacy Policy</span>
          <span>Terms of Use</span>
          <span>Support</span>
        </div>
      </main>
    </div>
  );
}
