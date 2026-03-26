import React, { useState } from "react";

export default function App() {
  const [step, setStep] = useState(1);
  
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  // Variables to check password rules
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasMinLength = password.length >= 8;
  
  // To store password is valid
  const isPasswordValid = hasUppercase && hasLowercase && hasNumber && hasMinLength;

  const handleNext = (e) => {
    e.preventDefault();
    if (email) setStep(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault(); 
    
    // Prevent submission if password rules are not okey
    if (!isPasswordValid) {
      setError("Please meet all password requirements before continuing.");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    
    setError(""); 
    console.log("New Account Registered:", { email, username, fullName, gender, password });
    alert(`Welcome ${username}! Your account has been successfully created.`);
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      fontFamily: '"Inter", sans-serif' 
    }}>
      <div style={{ 
        width: "100%", 
        maxWidth: "420px", 
        padding: "40px", 
        backgroundColor: "white", 
        borderRadius: "16px", 
        boxShadow: "0 15px 30px rgba(0,0,0,0.3)" 
      }}>
        
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
          <span style={{ height: "8px", width: "40px", borderRadius: "4px", backgroundColor: step >= 1 ? "#1e3c72" : "#e0e0e0", marginRight: "8px", transition: "0.3s" }}></span>
          <span style={{ height: "8px", width: "40px", borderRadius: "4px", backgroundColor: step >= 2 ? "#1e3c72" : "#e0e0e0", transition: "0.3s" }}></span>
        </div>

        <h2 style={{ textAlign: "center", color: "#333", marginBottom: "8px", fontSize: "28px" }}>Create Account</h2>
        <p style={{ textAlign: "center", color: "#777", marginBottom: "30px", fontSize: "14px" }}>
          {step === 1 ? "Let's start with your email" : "Tell us more about yourself"}
        </p>
        
        {step === 1 && (
          <form onSubmit={handleNext}>
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", marginBottom: "6px", color: "#444", fontSize: "14px", fontWeight: "500" }}>Email Address</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
                style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", outline: "none", fontSize: "16px" }}
                placeholder="name@example.com"
              />
            </div>
            <button 
              type="submit" 
              style={{ width: "100%", padding: "14px", backgroundColor: "#1e3c72", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", cursor: "pointer", fontWeight: "bold" }}
            >
              Continue
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "6px", color: "#444", fontSize: "14px", fontWeight: "500" }}>Username</label>
                <input
                  type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
                  style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", outline: "none" }}
                  placeholder="akif_senturk"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "6px", color: "#444", fontSize: "14px", fontWeight: "500" }}>Gender</label>
                <select 
                  value={gender} onChange={(e) => setGender(e.target.value)} required
                  style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", outline: "none", backgroundColor: "white" }}
                >
                  <option value="" disabled>Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", color: "#444", fontSize: "14px", fontWeight: "500" }}>Full Name</label>
              <input
                type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", outline: "none" }}
                placeholder="Akif Senturk"
              />
            </div>

            {/* PASSWORD FIELD AND REAL-TIME CONTROLS */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", color: "#444", fontSize: "14px", fontWeight: "500" }}>Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", outline: "none" }}
                placeholder="Create a strong password"
              />
              
              {/* Dynamic Password Rules List */}
              <ul style={{ listStyle: "none", padding: "0", marginTop: "8px", fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li style={{ color: hasMinLength ? "#2e7d32" : "#d32f2f", transition: "color 0.3s" }}>
                  {hasMinLength ? "✓" : "✗"} At least 8 characters
                </li>
                <li style={{ color: hasUppercase ? "#2e7d32" : "#d32f2f", transition: "color 0.3s" }}>
                  {hasUppercase ? "✓" : "✗"} At least 1 uppercase letter
                </li>
                <li style={{ color: hasLowercase ? "#2e7d32" : "#d32f2f", transition: "color 0.3s" }}>
                  {hasLowercase ? "✓" : "✗"} At least 1 lowercase letter
                </li>
                <li style={{ color: hasNumber ? "#2e7d32" : "#d32f2f", transition: "color 0.3s" }}>
                  {hasNumber ? "✓" : "✗"} At least 1 number
                </li>
              </ul>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", marginBottom: "6px", color: "#444", fontSize: "14px", fontWeight: "500" }}>Confirm Password</label>
              <input
                type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", outline: "none" }}
                placeholder="Repeat your password"
              />
              {error && <p style={{ color: "#d32f2f", fontSize: "13px", marginTop: "8px", marginBottom: "0", fontWeight: "500" }}>{error}</p>}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                type="button" 
                onClick={() => setStep(1)}
                style={{ flex: 1, padding: "14px", backgroundColor: "#f5f5f5", color: "#333", border: "1px solid #ddd", borderRadius: "8px", fontSize: "16px", cursor: "pointer", fontWeight: "bold" }}
              >
                Back
              </button>
              <button 
                type="submit" 
                style={{ flex: 2, padding: "14px", backgroundColor: "#1e3c72", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", opacity: isPasswordValid ? 1 : 0.7 }}
              >
                Sign Up
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}