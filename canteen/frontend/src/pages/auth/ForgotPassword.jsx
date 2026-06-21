import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ForgotPassword.css";

function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify OTP, 3: Reset Password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSendOtp = async () => {
    if (!email) {
      showMsg("Please enter your registered email address.", true);
      return;
    }

    setIsLoading(true);
    clearMsg();

    try {
      const response = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showMsg("OTP sent successfully to your email.", false);
        setStep(2);
      } else {
        showMsg(data.message || "Failed to send OTP. Please check your email.", true);
      }
    } catch (error) {
      console.error(error);
      showMsg("Failed to connect to the server.", true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      showMsg("Please enter the 6-digit OTP code.", true);
      return;
    }

    setIsLoading(true);
    clearMsg();

    try {
      const response = await fetch("http://localhost:5000/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp_code: otp }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showMsg("OTP verified successfully.", false);
        setStep(3);
      } else {
        showMsg(data.message || "Invalid or expired OTP code.", true);
      }
    } catch (error) {
      console.error(error);
      showMsg("Failed to connect to the server.", true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      showMsg("Please enter and confirm your new password.", true);
      return;
    }

    if (newPassword !== confirmPassword) {
      showMsg("Passwords do not match.", true);
      return;
    }

    if (newPassword.length < 5) {
      showMsg("Password must be at least 5 characters long.", true);
      return;
    }

    setIsLoading(true);
    clearMsg();

    try {
      const response = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp_code: otp, new_password: newPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert("Password reset successfully! Redirecting to Login...");
        navigate("/login");
      } else {
        showMsg(data.message || "Failed to reset password. Please try again.", true);
      }
    } catch (error) {
      console.error(error);
      showMsg("Failed to connect to the server.", true);
    } finally {
      setIsLoading(false);
    }
  };

  const showMsg = (txt, errStatus = false) => {
    setMessage(txt);
    setIsError(errStatus);
  };

  const clearMsg = () => {
    setMessage("");
    setIsError(false);
  };

  return (
    <div className="login-page">
      <div className="main-card">
        {/* HEADER */}
        <div className="department-header">
          <img src="/images/images.png" alt="Government Logo" className="dept-logo" />
          <div className="dept-title">
            <h1>Office of the Principal Accountant General (A&E), W.B.</h1>
            <p>Treasury Buildings, Kolkata - 700001</p>
          </div>
          <img src="/images/IA&AS_Logo.png" alt="IA&AS Logo" className="dept-logo" />
        </div>

        {/* CONTENT */}
        <div className="content-area">
          <div className="login-card">
            <h2>Reset Password</h2>
            <p className="login-subtitle">eCanteen Food Coupon & Ordering System</p>

            {message && (
              <div className={`form-message ${isError ? "error" : "success"}`}>
                {message}
              </div>
            )}

            {/* STEP 1: Enter Email */}
            {step === 1 && (
              <div className="step-container">
                <div className="form-group">
                  <label>Registered Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  />
                </div>
                <button className="login-btn" onClick={handleSendOtp} disabled={isLoading}>
                  {isLoading ? "Sending OTP..." : "Send OTP"}
                </button>
              </div>
            )}

            {/* STEP 2: Verify OTP */}
            {step === 2 && (
              <div className="step-container">
                <div className="form-group">
                  <label>Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter OTP code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    disabled={isLoading}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                  />
                  <small className="form-help">An OTP has been sent to {email}</small>
                </div>
                <button className="login-btn" onClick={handleVerifyOtp} disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </button>
                <div className="step-back-link">
                  <span onClick={() => { setStep(1); clearMsg(); }}>Change Email</span>
                </div>
              </div>
            )}

            {/* STEP 3: Enter New Password */}
            {step === 3 && (
              <div className="step-container">
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                  />
                </div>
                <button className="login-btn" onClick={handleResetPassword} disabled={isLoading}>
                  {isLoading ? "Resetting Password..." : "Reset Password"}
                </button>
              </div>
            )}

            <div className="forgot-password-back">
              <span onClick={() => navigate("/login")}>Back to Login</span>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="login-footer">
          © 2026 eCanteen | Office Canteen Management System
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
