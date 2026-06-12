import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
    FaSignOutAlt,
    FaQrcode,
    FaCheckCircle,
    FaTimesCircle,
    FaUtensils,
    FaLock,
    FaBarcode
} from "react-icons/fa";

import "./Kitchen.css";

function Kitchen() {
    const navigate = useNavigate();
    const inputRef = useRef(null);

    const user = JSON.parse(localStorage.getItem("user")) || {};

    // State variables
    const [couponCode, setCouponCode] = useState("");
    const [scannedOrder, setScannedOrder] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [redeeming, setRedeeming] = useState(false);

    const [stats, setStats] = useState({
        total: 0,
        redeemed: 0,
        pending: 0
    });

    // Validate that a staff is logged in
    useEffect(() => {
        if (!user.employee_id || user.role !== "STAFF") {
            navigate("/login");
            return;
        }
        fetchData();
        // Setup polling every 6 seconds to keep stats card in sync
        const interval = setInterval(fetchData, 6000);
        return () => clearInterval(interval);
    }, []);

    // Focus input listener (keep hidden input focused at all times)
    useEffect(() => {
        focusInput();
        const handleBodyClick = () => focusInput();
        document.body.addEventListener("click", handleBodyClick);
        return () => document.body.removeEventListener("click", handleBodyClick);
    }, []);

    const focusInput = () => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const fetchData = async () => {
        try {
            // Fetch stats
            const statsRes = await axios.get("http://localhost:5000/api/orders/counter-stats");
            if (statsRes.data.success) {
                setStats({
                    total: statsRes.data.total,
                    redeemed: statsRes.data.redeemed,
                    pending: statsRes.data.pending
                });
            }
        } catch (err) {
            console.error("Error loading kitchen data:", err);
        }
    };

    // Verify code details from backend
    const handleVerify = async (code) => {
        if (!code) return;
        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");
        try {
            const response = await axios.get(`http://localhost:5000/api/orders/verify-coupon/${code}`);
            if (response.data.success) {
                setScannedOrder(response.data.order);
                setCouponCode(""); // Reset input
            }
        } catch (err) {
            console.error("Verify Error:", err);
            setErrorMessage(err.response?.data?.message || "Invalid Coupon Code");
            setScannedOrder(null);
            setCouponCode("");
        } finally {
            setLoading(false);
            focusInput();
        }
    };

    // Redeem coupon action
    const handleRedeem = async () => {
        if (!scannedOrder) return;
        setRedeeming(true);
        setErrorMessage("");
        setSuccessMessage("");
        try {
            const response = await axios.post("http://localhost:5000/api/orders/redeem-coupon", {
                couponCode: scannedOrder.coupon_code
            });

            if (response.data.success) {
                setSuccessMessage(`Order ORD${scannedOrder.order_id} Redeemed Successfully!`);
                setScannedOrder(null);
                setCouponCode("");
                fetchData();
            }
        } catch (err) {
            console.error("Redemption Error:", err);
            setErrorMessage(err.response?.data?.message || "Failed to redeem coupon.");
        } finally {
            setRedeeming(false);
            focusInput();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (scannedOrder) {
                // If details are loaded, Enter redeems the coupon
                handleRedeem();
            } else if (couponCode.trim()) {
                // If scanner output is in input, Enter verifies/loads details
                handleVerify(couponCode.trim());
            }
        }
    };

    // Close Counter action (Bulk redeems today's pending lunch coupons)
    const handleCloseCounter = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to close the counter?\n\nAll pending lunch coupons for today will be automatically redeemed."
        );
        if (!confirmed) return;

        try {
            const response = await axios.post("http://localhost:5000/api/orders/close-counter-lunch");
            if (response.data.success) {
                setSuccessMessage(response.data.message);
                setScannedOrder(null);
                setCouponCode("");
                fetchData();
            }
        } catch (err) {
            console.error("Close Counter Error:", err);
            setErrorMessage(err.response?.data?.message || "Failed to close counter.");
        } finally {
            focusInput();
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <div className="kitchen-page">
            {/* HIDDEN SCANNER INPUT FOR CONSTANT SCAN CAPTURE */}
            <input
                ref={inputRef}
                type="text"
                className="hidden-scanner-input"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading || redeeming}
                autoComplete="off"
            />

            <div className="kitchen-main-card">
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

                    <div className="header-right">
                        <span className="staff-badge">Staff: {user.full_name || "Kitchen Staff"}</span>
                        <button className="close-counter-header-btn" onClick={handleCloseCounter}>
                            <FaLock />
                            Close Counter
                        </button>
                        <button className="logout-btn" onClick={handleLogout}>
                            <FaSignOutAlt />
                            Logout
                        </button>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="kitchen-content">
                    {/* STATS HEADER TABS (with different daily background colors) */}
                    <div className="stats-row">
                        <div className="stat-tab stat-tab-total">
                            <span className="stat-label">Total Coupons Generated</span>
                            <span className="stat-number">{stats.total}</span>
                        </div>
                        <div className="stat-tab stat-tab-redeemed">
                            <span className="stat-label">Redeemed Coupons</span>
                            <span className="stat-number">{stats.redeemed}</span>
                        </div>
                        <div className="stat-tab stat-tab-pending">
                            <span className="stat-label">Pending Coupons</span>
                            <span className="stat-number">{stats.pending}</span>
                        </div>
                    </div>

                    {/* DYNAMIC MESSAGES */}
                    {errorMessage && (
                        <div className="messages-container">
                            <div className="msg-alert error">
                                <FaTimesCircle />
                                <span>{errorMessage}</span>
                            </div>
                        </div>
                    )}

                    {successMessage && (
                        <div className="messages-container">
                            <div className="msg-alert success">
                                <FaCheckCircle />
                                <span>{successMessage}</span>
                            </div>
                        </div>
                    )}

                    {/* MIDDLE: DISPLAY AREA */}
                    <div className="redemption-display-wrapper">
                        {loading ? (
                            <div className="loading-placeholder">
                                <div className="spinner"></div>
                                <p>Verifying Coupon details...</p>
                            </div>
                        ) : scannedOrder ? (
                            <div className="scanned-meal-card">
                                <div className="meal-card-header">
                                    <div className="meal-id">Order ID: <span className="blue-text">ORD{scannedOrder.order_id}</span></div>
                                    <div className="meal-employee">Employee: <strong>{scannedOrder.employee_name}</strong></div>
                                </div>

                                <div className="meal-items-display">
                                    <div className="display-hint"><FaUtensils /> Items to Serve</div>
                                    <div className="display-items-grid">
                                        {scannedOrder.items.map((item, idx) => (
                                            <div className="big-meal-row" key={idx}>
                                                <div className="big-meal-name">{item.item_name}</div>
                                                <div className="big-meal-qty">Qty: {item.quantity}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="meal-card-footer">
                                    <button 
                                        className="big-redeem-btn" 
                                        onClick={handleRedeem}
                                        disabled={redeeming}
                                    >
                                        {redeeming ? "Redeeming..." : "Deliver & Redeem (Press Enter)"}
                                    </button>
                                    <button 
                                        className="big-clear-btn"
                                        onClick={() => {
                                            setScannedOrder(null);
                                            setSuccessMessage("");
                                            focusInput();
                                        }}
                                        disabled={redeeming}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="empty-display-placeholder">
                                <div className="action-box">
                                    <FaBarcode className="radar-icon" />
                                    <h3>Scanner Active & Listening</h3>
                                    <p>Please scan the employee QR coupon code using your attached scanner gun. The details will show automatically.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Kitchen;
