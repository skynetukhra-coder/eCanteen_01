import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaUser,
  FaLock,
  FaCreditCard,
  FaBell,
  FaChevronRight,
  FaClipboardList,
  FaTicketAlt,
  FaWallet,
  FaSignOutAlt,
  FaHome,
} from "react-icons/fa";

import "./Profile.css";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

useEffect(() => {
    const storedUser = localStorage.getItem("user");
    
    if (!storedUser) {
      // 🚨 NO USER FOUND: Immediately redirect back to login
      // 'replace: true' prevents them from clicking 'Back' to return here
      navigate("/login", { replace: true });
    } else {
      // USER EXISTS: Parse data and stop the loading block
      setUser(JSON.parse(storedUser));
      setLoading(false);
    }
  }, [navigate]);

  // Prevent a "flash" of the blank profile screen while redirecting
  if (loading) {
    return null; 
  }


  return (
    <div className="home-page">
      <div className="main-card">

        {/* HEADER */}

        <div className="department-header">

          <img
            src="/images/images.png"
            alt="Government Logo"
            className="dept-logo"
          />

          <div className="dept-title">

            <h1>
              Office of the Principal
              Accountant General (A&E), W.B.
            </h1>

            <p>
              Treasury Buildings,
              Kolkata - 700001
            </p>

          </div>

          <img
            src="/images/IA&AS_Logo.png"
            alt="IAAS Logo"
            className="dept-logo"
          />

        </div>

        {/* CONTENT */}

        <div className="profile-content">

          {/* BACK BUTTON */}

          <button
            className="back-button"
            onClick={() => navigate("/home")}
          >
            <FaArrowLeft />
            Back
          </button>

          {/* TITLE */}

          <div className="profile-title">
            <h2>Profile</h2>
          </div>

          {/* PROFILE CARD */}

          <div className="profile-card">

            <img
              src={
                user?.profile_image
                  ? (user.profile_image.startsWith("http") ? user.profile_image : `http://localhost:5000${user.profile_image}`)
                  : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.full_name || user?.username || 'User')}`
              }
              alt="Profile"
              className="profile-image"
            />

            <div className="profile-details">

              <h3>
                {user?.full_name || "Test User"}
              </h3>

              <p>
                Employee ID: {user?.username || "test123456"}
              </p>

            </div>

          </div>

          {/* MENU LIST */}

          <div className="menu-list">

            <div
              className="menu-item"
              onClick={() =>
                navigate(
                  "/personal-information"
                )
              }
            >
              <div className="menu-left">
                <FaUser />
                <span>
                  Personal Information
                </span>
              </div>

              <FaChevronRight />
            </div>

            <div
              className="menu-item"
              onClick={() =>
                navigate(
                  "/change-password"
                )
              }
            >
              <div className="menu-left">
                <FaLock />
                <span>
                  Change Password
                </span>
              </div>

              <FaChevronRight />
            </div>

            <div
              className="menu-item"
              onClick={() =>
                navigate(
                  "/payment-methods"
                )
              }
            >
              <div className="menu-left">
                <FaCreditCard />
                <span>
                  Payment Methods
                </span>
              </div>

              <FaChevronRight />
            </div>

            <div
              className="menu-item"
              onClick={() =>
                navigate(
                  "/notification-settings"
                )
              }
            >
              <div className="menu-left">
                <FaBell />
                <span>
                  Notification Settings
                </span>
              </div>

              <FaChevronRight />
            </div>

          </div>

        </div>

        {/* FOOTER */}

        <div className="bottom-footer">

          <div
            className="footer-item"
            onClick={() =>
              navigate("/home")
            }
          >
            <FaHome />
            <span>Home</span>
          </div>

          <div
            className="footer-item"
            onClick={() =>
              navigate("/orders")
            }
          >
            <FaClipboardList />
            <span>Orders</span>
          </div>

          <div
            className="footer-item"
            onClick={() =>
              navigate("/coupons")
            }
          >
            <FaTicketAlt />
            <span>Coupons</span>
          </div>

          <div
            className="footer-item"
            onClick={() =>
              navigate("/wallet")
            }
          >
            <FaWallet />
            <span>Wallet</span>
          </div>

          <div
            className="footer-item"
            onClick={handleLogout}
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Profile;