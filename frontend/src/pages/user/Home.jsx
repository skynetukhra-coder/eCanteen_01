import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaUser,
  FaClipboardList,
  FaTicketAlt,
  FaWallet,
  FaSignOutAlt,
  FaBell,
  FaStar,
  FaCommentDots,
  FaPaperPlane,
} from "react-icons/fa";

import breakfastImg from "../../assets/images/breakfast.jpg";
import lunchImg from "../../assets/images/lunch.jpg";
import snacksImg from "../../assets/images/snacks.jpg";

import "./Home.css";

function Home() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const isCashier = user?.role === "CASHIER" || user?.username === "admin";

  const [cashierStats, setCashierStats] = useState({ cashCollection: 0.00, qrCollection: 0.00 });
  const [walletBalance, setWalletBalance] = useState(0.00);
  const [notifications, setNotifications] = useState([]);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [timeSlots, setTimeSlots] = useState({
    breakfast: "06:00 AM - 10:00 AM",
    lunch: "11:30 AM - 02:30 PM",
    snacks: "04:00 PM - 06:00 PM"
  });

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState(1);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackCategory, setFeedbackCategory] = useState("General");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState("");
  const [feedbackErrorMsg, setFeedbackErrorMsg] = useState("");

  useEffect(() => {
    const fetchBalanceOrStats = () => {
      if (isCashier && user?.employee_id) {
        axios.get((window.API_BASE_URL || "http://localhost:5000") + `/api/orders/cashier-stats/${user.employee_id}`)
          .then(res => {
            if (res.data.success) {
              setCashierStats({
                cashCollection: res.data.cashCollection,
                qrCollection: res.data.qrCollection
              });
            }
          })
          .catch(err => console.error("Error loading cashier stats:", err));
      } else if (user?.employee_id) {
        axios.get((window.API_BASE_URL || "http://localhost:5000") + `/api/wallet/balance/${user.employee_id}`)
          .then(res => {
            setWalletBalance(parseFloat(res.data.balance || 0.00));
          })
          .catch(err => console.error("Error loading wallet balance:", err));
      }
    };

    fetchBalanceOrStats();
    const interval = setInterval(fetchBalanceOrStats, 4000);

    axios.get((window.API_BASE_URL || "http://localhost:5000") + "/api/menu/slots/all")
      .then(res => {
        const slots = {};
        res.data.forEach(s => {
          slots[s.category.toLowerCase()] = `${s.start_time} - ${s.end_time}`;
        });
        setTimeSlots(prev => ({ ...prev, ...slots }));
      })
      .catch(err => console.error("Error loading time slots:", err));
    fetchNotifications();

    return () => clearInterval(interval);
  }, [user?.employee_id, user?.username]);

  const fetchNotifications = () => {
    axios.get((window.API_BASE_URL || "http://localhost:5000") + "/api/notifications/list")
      .then(res => {
        setNotifications(res.data);
      })
      .catch(err => console.error("Error fetching notifications:", err));
  };

  const [lastViewedId, setLastViewedId] = useState(
    parseInt(localStorage.getItem("lastViewedNotifId") || "0")
  );
  const unreadCount = notifications.filter(n => n.id > lastViewedId).length;

  const openNotificationsModal = () => {
    setIsNotifModalOpen(true);
    if (notifications.length > 0) {
      const maxId = Math.max(...notifications.map(n => n.id));
      localStorage.setItem("lastViewedNotifId", String(maxId));
      setLastViewedId(maxId);
    }
  };

  const isTimeInSlot = (slotStr) => {
    if (!slotStr) return false;
    const parts = slotStr.split("-");
    if (parts.length !== 2) return false;
    
    const parseTimeString = (tStr) => {
        const match = tStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return null;
        let [_, hours, minutes, modifier] = match;
        let hrs = parseInt(hours, 10);
        if (modifier.toUpperCase() === "PM" && hrs < 12) hrs += 12;
        if (modifier.toUpperCase() === "AM" && hrs === 12) hrs = 0;
        const d = new Date();
        d.setHours(hrs, parseInt(minutes, 10), 0, 0);
        return d;
    };

    const startTime = parseTimeString(parts[0]);
    const endTime = parseTimeString(parts[1]);
    if (!startTime || !endTime) return false;

    const now = new Date();
    if (endTime < startTime) {
        endTime.setDate(endTime.getDate() + 1);
    }
    return now >= startTime && now <= endTime;
  };

  const handleMenuClick = (menu) => {
    navigate(`/menu/${menu.title.toLowerCase()}`);
  };

  const menuItems = [
    {
      id: 1,
      title: "Breakfast",
      //item: "Poha + Tea",
      time: timeSlots.breakfast,
      image: breakfastImg,
    },
    {
      id: 2,
      title: "Lunch",
      //item: "Rice + Dal + Paneer",
      time: timeSlots.lunch,
      image: lunchImg,
    },
    {
      id: 3,
      title: "Tiffin",
      //item: "Samosa + Tea",
      time: timeSlots.snacks,
      image: snacksImg,
    },
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) {
      setFeedbackErrorMsg("Please enter your feedback message.");
      return;
    }
    setFeedbackSubmitting(true);
    setFeedbackErrorMsg("");
    setFeedbackSuccessMsg("");

    axios.post((window.API_BASE_URL || "http://localhost:5000") + "/api/feedback", {
      employee_id: user?.employee_id || null,
      user_name: user?.full_name || user?.username || "Guest Employee",
      rating: feedbackRating,
      category: feedbackCategory,
      message: feedbackMessage.trim()
    })
      .then(res => {
        if (res.data.success) {
          setFeedbackSuccessMsg("Thank you! Your feedback has been submitted successfully.");
          setFeedbackMessage("");
          setFeedbackRating(1);
          setFeedbackCategory("General");
          setTimeout(() => setFeedbackSuccessMsg(""), 5000);
        } else {
          setFeedbackErrorMsg(res.data.message || "Failed to submit feedback.");
        }
      })
      .catch(err => {
        console.error("Error submitting feedback:", err);
        setFeedbackErrorMsg("Failed to submit feedback. Please try again.");
      })
      .finally(() => {
        setFeedbackSubmitting(false);
      });
  };

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
              Office of the Principal Accountant General (A&E), W.B.
            </h1>

            <p>
              Treasury Buildings, Kolkata - 700001
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <div className="notification-bell-container" onClick={openNotificationsModal} style={{ position: "relative", cursor: "pointer", padding: "10px", background: "#f1f5f9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FaBell style={{ color: "#334155", fontSize: "20px" }} />
              {unreadCount > 0 && (
                <span className="bell-badge" style={{ position: "absolute", top: "-5px", right: "-5px", background: "#ef4444", color: "white", borderRadius: "50%", padding: "2px 6px", fontSize: "10px", fontWeight: "bold" }}>
                  {unreadCount}
                </span>
              )}
            </div>

            <img
              src="/images/IA&AS_Logo.png"
              alt="IA&AS Logo"
              className="dept-logo"
            />
          </div>
        </div>

        {/* BULLETIN MARQUEE */}
        <div className="bulletin-bar">
          <div className="bulletin-title">Bulletin:</div>
          <div className="bulletin-wrapper">
            <div className="bulletin-text">
              {notifications.filter(n => n.show_in_bulletin === 1).length > 0
                ? notifications.filter(n => n.show_in_bulletin === 1).map(n => `🔔 [${n.type === 'ANNOUNCEMENT' ? 'Announcement' : 'Special Menu'}] ${n.title}: ${n.message || n.item_name || ''}`).join("     |     ")
                : "Welcome to eCanteen! No new notifications at this time."}
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="content-area">

          {/* PROFILE CARD */}
          <div className="profile-card">
            <div className="profile-left">
              <img
                src={
                  user?.profile_image
                    ? (user.profile_image.startsWith("http") ? user.profile_image : `${window.API_BASE_URL || "http://localhost:5000"}${user.profile_image}`)
                    : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.full_name || user?.username || 'User')}`
                }
                alt="Profile"
                className="profile-image"
                onClick={() => navigate((user?.role === "ADMIN" || isCashier) ? "/admin" : "/profile")}
              />

              <div>
                <h3>
                  Hello, {user?.full_name || "Employee"}
                </h3>

                <p>
                  Username: {user?.username || "-"}
                </p>
              </div>
            </div>

            {(user?.role === "ADMIN" || isCashier) ? (
              isCashier ? null : (
                <button
                  className="profile-btn"
                  onClick={() => navigate("/admin")}
                  style={{ background: "#7c3aed", color: "#fff" }}
                >
                  Back to Dashboard
                </button>
              )
            ) : (
              <button
                className="profile-btn"
                onClick={() => navigate("/profile")}
              >
                View Profile
              </button>
            )}
          </div>

          {/* WALLET CARD / OPERATOR WIDGET */}
          {isCashier ? (
            <div className="operator-details-card" style={{ background: "linear-gradient(135deg, #1e3a8a, #3b82f6)", color: "white", padding: "20px", borderRadius: "15px", marginBottom: "25px", boxShadow: "0 4px 15px rgba(59, 130, 246, 0.2)" }}>
              <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>Operator Console Info</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px 10px", fontSize: "13px" }}>
                <div>
                  <span style={{ opacity: 0.8 }}>Today's Total Cash Collection:</span>
                  <strong style={{ display: "block", color: "#4ade80", fontSize: "18px", marginTop: "5px" }}>₹{cashierStats.cashCollection.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ opacity: 0.8 }}>Today's Total QR Collection:</span>
                  <strong style={{ display: "block", color: "#4ade80", fontSize: "18px", marginTop: "5px" }}>₹{cashierStats.qrCollection.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="wallet-card">
              <div>
                <span>Today's Balance</span>
                <h2>₹{walletBalance.toFixed(2)}</h2>
              </div>

              <button
                onClick={() => navigate("/wallet")}
              >
                View Wallet
              </button>
            </div>
          )}

          {/* MENU SECTION */}
          <div className="menu-section">

            <div className="menu-header">
              Today's Menu
            </div>

            <div className="menu-date">
              {new Date().toLocaleDateString()}
            </div>

            {menuItems.map((menu) => (
              <div
                key={menu.id}
                className="menu-card"
                onClick={() => handleMenuClick(menu)}
              >
                <img
                  src={menu.image}
                  alt={menu.title}
                  className="food-image"
                />

                <div className="menu-details">
                  <h4>{menu.title}</h4>
                  <p>{menu.item}</p>
                  <span>{menu.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* FEEDBACK SECTION */}
          <div className="feedback-section">
            <div className="feedback-card">
              <div className="feedback-header">
                <FaCommentDots className="feedback-icon" />
                <div>
                  <h3>Give Your Feedback</h3>
                  <p>We'd love to hear your thoughts on our food & service!</p>
                </div>
              </div>

              {feedbackSuccessMsg && (
                <div className="feedback-alert feedback-alert-success">
                  {feedbackSuccessMsg}
                </div>
              )}

              {feedbackErrorMsg && (
                <div className="feedback-alert feedback-alert-error">
                  {feedbackErrorMsg}
                </div>
              )}

              <form onSubmit={handleFeedbackSubmit} className="feedback-form">
                <div className="feedback-field-group">
                  <label className="feedback-label">Rating</label>
                  <div className="star-rating-container">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        className={`star-icon ${star <= (hoverRating || feedbackRating) ? "active" : ""}`}
                        onClick={() => setFeedbackRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                      />
                    ))}
                    <span className="rating-text">
                      {hoverRating || feedbackRating} / 5
                    </span>
                  </div>
                </div>

                <div className="feedback-field-group">
                  <label className="feedback-label" htmlFor="feedback-category">Category</label>
                  <select
                    id="feedback-category"
                    className="feedback-select"
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value)}
                  >
                    <option value="General">General</option>
                    <option value="Food Quality">Food Quality</option>
                    <option value="Service">Service & Cleanliness</option>
                    <option value="Tiffin">Tiffin & Snacks</option>
                    <option value="Pricing">Pricing & Portions</option>
                  </select>
                </div>

                <div className="feedback-field-group">
                  <label className="feedback-label" htmlFor="feedback-message">Your Comment</label>
                  <textarea
                    id="feedback-message"
                    className="feedback-textarea"
                    rows="3"
                    placeholder="Share your experience or suggestions for improvement..."
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="feedback-submit-btn"
                  disabled={feedbackSubmitting}
                >
                  <FaPaperPlane /> {feedbackSubmitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </form>
            </div>
          </div>

          {/* LOGOUT */}


        </div>

        {/* FOOTER */}
        <div className="bottom-footer">

          {!isCashier && (
            <div
              className="footer-item"
              onClick={() => navigate((user?.role === "ADMIN" || isCashier) ? "/admin" : "/profile")}
            >
              <FaUser />
              <span>{(user?.role === "ADMIN" || isCashier) ? "Dashboard" : "Profile"}</span>
            </div>
          )}

          <div
            className="footer-item"
            onClick={() => navigate("/orders")}
          >
            <FaClipboardList />
            <span>Orders</span>
          </div>

          <div
            className="footer-item"
            onClick={() => navigate("/coupons")}
          >
            <FaTicketAlt />
            <span>Coupons</span>
          </div>

          {!isCashier && (
            <div
              className="footer-item"
              onClick={() => navigate("/wallet")}
            >
              <FaWallet />
              <span>Wallet</span>
            </div>
          )}

          <div
            className="footer-item"
            onClick={handleLogout}
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </div>

        </div>

        {/* NOTIFICATIONS LIST MODAL */}
        {isNotifModalOpen && (
          <div className="employee-modal-overlay">
            <div className="employee-modal-card">
              <div className="employee-modal-header">
                <h3>Notifications & Updates</h3>
                <button className="close-modal-btn" onClick={() => setIsNotifModalOpen(false)}>×</button>
              </div>
              <div className="employee-modal-body" style={{ maxHeight: "400px", overflowY: "auto", padding: "16px" }}>
                {notifications.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#64748b", margin: "20px 0" }}>No new notifications at this time.</p>
                ) : (
                  <div className="notif-list" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className="notif-item" 
                        onClick={() => setSelectedNotif(notif)}
                        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", background: "#f8fafc", cursor: "pointer", border: "1px solid #e2e8f0", transition: "all 0.2s" }}
                      >
                        <div style={{
                          background: notif.type === "ANNOUNCEMENT" ? "#dbeafe" : "#dcfce7",
                          color: notif.type === "ANNOUNCEMENT" ? "#2563eb" : "#16a34a",
                          padding: "10px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "36px",
                          height: "36px"
                        }}>
                          <FaBell />
                        </div>
                        <div style={{ flex: 1, textAlign: "left" }}>
                          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{notif.title}</h4>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>{notif.type === "ANNOUNCEMENT" ? "Announcement" : "Special Menu"}</span>
                        </div>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATION DETAILS MODAL */}
        {selectedNotif && (
          <div className="employee-modal-overlay" style={{ zIndex: 1100 }}>
            <div className="employee-modal-card">
              <div className="employee-modal-header">
                <h3>{selectedNotif.type === "ANNOUNCEMENT" ? "Announcement Details" : "Special Menu Item"}</h3>
                <button className="close-modal-btn" onClick={() => setSelectedNotif(null)}>×</button>
              </div>
              <div className="employee-modal-body" style={{ padding: "16px" }}>
                <h4 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "12px", textAlign: "left" }}>{selectedNotif.title}</h4>
                
                {selectedNotif.type === "ANNOUNCEMENT" ? (
                  <p style={{ fontSize: "14px", color: "#334155", lineHeight: "1.5", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", margin: 0, textAlign: "left", whiteSpace: "pre-wrap" }}>
                    {selectedNotif.message}
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    {selectedNotif.image_url && (
                      <img 
                        src={`${window.API_BASE_URL || "http://localhost:5000"}${selectedNotif.image_url}`} 
                        alt={selectedNotif.item_name} 
                        style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                      />
                    )}
                    <div style={{ textAlign: "left" }}>
                      <strong style={{ display: "block", fontSize: "16px", color: "#0f172a" }}>{selectedNotif.item_name}</strong>
                      <span style={{ display: "block", fontSize: "18px", color: "#16a34a", fontWeight: "700", marginTop: "4px" }}>₹{selectedNotif.price}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="employee-modal-footer" style={{ padding: "12px 16px", background: "#f8fafc", display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0" }}>
                <button className="close-btn" onClick={() => setSelectedNotif(null)} style={{ border: "none", background: "#cbd5e1", color: "#475569", padding: "8px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>Close</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Home;