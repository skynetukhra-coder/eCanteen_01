import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { FaArrowLeft, FaDownload, FaCheckCircle, FaUser, FaClipboardList, FaTicketAlt, FaWallet, FaSignOutAlt, FaPrint, FaHome } from "react-icons/fa";
import "./Coupon.css";
import "./PaymentSuccess.css"; // Reuse print styles

function Coupon() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user")) || {};

    const [activeCoupons, setActiveCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPrintCoupon, setSelectedPrintCoupon] = useState(null);

    useEffect(() => {
        if (!user.employee_id) {
            navigate("/login");
            return;
        }
        fetchActiveCoupons(false);
        const interval = setInterval(() => {
            fetchActiveCoupons(true);
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    const fetchActiveCoupons = async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            const response = await axios.get(
                (window.API_BASE_URL || "http://localhost:5000") + `/api/orders/coupons/active/${user.employee_id}`
            );
            setActiveCoupons(response.data || []);
        } catch (err) {
            console.error("COUPON API ERROR:", err);
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    const handlePrint = (coupon) => {
        setSelectedPrintCoupon(coupon);
        setTimeout(() => {
            window.print();
            setSelectedPrintCoupon(null);
            navigate("/home");
        }, 200);
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    if (loading) {
        return (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "16px" }}>
                Loading coupons...
            </div>
        );
    }

    return (
        <div className="coupon-page">
            <div className="coupon-main-card">
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
                        <p>Treasury Buildings, Kolkata - 700001</p>
                    </div>
                    <img
                        src="/images/IA&AS_Logo.png"
                        alt="IA&AS Logo"
                        className="dept-logo"
                    />
                </div>

                {/* CONTENT */}
                <div className="coupon-content">
                    <div className="page-title">
                        <FaArrowLeft
                            className="back-icon"
                            onClick={() => navigate("/home")}
                        />
                        <h2>Active Meal Coupons</h2>
                    </div>

                    <p className="coupon-subtitle" style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
                        All unredeemed meal coupons currently awaiting counter service.
                    </p>

                    {activeCoupons.length === 0 ? (
                        <div style={{ padding: "40px 20px", textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: "15px", background: "#f8fafc" }}>
                            <FaTicketAlt style={{ fontSize: "48px", color: "#94a3b8", marginBottom: "12px" }} />
                            <h3 style={{ color: "#475569", margin: "0 0 5px 0" }}>No Active Coupons</h3>
                            <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>You have no coupons waiting to be redeemed at this time.</p>
                        </div>
                    ) : (
                        <div className="coupons-list" style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                            {activeCoupons.map((coupon) => (
                                <div
                                    className="coupon-card"
                                    key={coupon.order_id}
                                    style={{
                                        margin: 0,
                                        border: coupon.order_status === "CANCELLED" ? "1.5px solid #fca5a5" : undefined,
                                        background: coupon.order_status === "CANCELLED" ? "#fffafa" : undefined
                                    }}
                                >
                                    {coupon.order_status === "CANCELLED" ? (
                                        <>
                                            <div style={{ textAlign: "center", padding: "10px 0" }}>
                                                <div style={{ fontSize: "40px", color: "#ef4444", marginBottom: "8px" }}>❌</div>
                                                <h3 style={{ color: "#dc2626", margin: "0 0 6px 0" }}>Order Cancelled</h3>
                                                <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
                                                    This order has been cancelled by the canteen administration. No meal coupon will be issued.
                                                </p>
                                            </div>

                                            <div className="coupon-details" style={{ marginTop: "15px" }}>
                                                <div className="detail-row">
                                                    <span>Order ID</span>
                                                    <strong style={{ color: "#dc2626", fontSize: "15px" }}>ORD{coupon.order_id}</strong>
                                                </div>
                                                <div className="detail-row">
                                                    <span>Items</span>
                                                    <strong>{coupon.items || "Meal Items"}</strong>
                                                </div>
                                                <div className="detail-row">
                                                    <span>Amount</span>
                                                    <strong>₹{parseFloat(coupon.total_amount).toFixed(2)}</strong>
                                                </div>
                                                <div className="detail-row">
                                                    <span>Date</span>
                                                    <strong>{new Date(coupon.created_at).toLocaleDateString()}</strong>
                                                </div>
                                                <div className="detail-row">
                                                    <span>Status</span>
                                                    <strong style={{ color: "#dc2626", background: "#fee2e2", padding: "4px 12px", borderRadius: "20px", fontWeight: "700" }}>CANCELLED</strong>
                                                </div>
                                            </div>

                                            <div style={{ marginTop: "15px", textAlign: "center" }}>
                                                <button
                                                    onClick={() => navigate("/orders")}
                                                    style={{
                                                        background: "#f1f5f9",
                                                        border: "1px solid #cbd5e1",
                                                        color: "#475569",
                                                        padding: "8px 16px",
                                                        borderRadius: "8px",
                                                        fontSize: "13px",
                                                        fontWeight: "600",
                                                        cursor: "pointer"
                                                    }}
                                                >
                                                    View in Order History
                                                </button>
                                            </div>
                                        </>
                                    ) : coupon.order_status === "PENDING_APPROVAL" ? (
                                        <>
                                            <div style={{ textAlign: "center", padding: "10px 0" }}>
                                                <div style={{ fontSize: "40px", color: "#d97706", marginBottom: "8px" }}>⏳</div>
                                                <h3 style={{ color: "#d97706", margin: "0 0 6px 0" }}>Payment Processed, Awaiting Confirmation</h3>
                                                <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
                                                    Your UPI payment is currently under admin verification. Food coupon & QR code will be generated as soon as Admin approves.
                                                </p>
                                            </div>

                                            <div className="coupon-details" style={{ marginTop: "15px" }}>
                                                <div className="detail-row">
                                                    <span>Order ID</span>
                                                    <strong>ORD{coupon.order_id}</strong>
                                                </div>
                                                <div className="detail-row">
                                                    <span>Items</span>
                                                    <strong>{coupon.items || "Meal Items"}</strong>
                                                </div>
                                                <div className="detail-row">
                                                    <span>Amount Paid</span>
                                                    <strong>₹{parseFloat(coupon.total_amount).toFixed(2)}</strong>
                                                </div>
                                                <div className="detail-row">
                                                    <span>Date Submitted</span>
                                                    <strong>{new Date(coupon.created_at).toLocaleDateString()}</strong>
                                                </div>
                                                <div className="detail-row">
                                                    <span>Status</span>
                                                    <strong style={{ color: "#d97706", background: "#fef3c7", padding: "4px 10px", borderRadius: "20px" }}>AWAITING CONFIRMATION</strong>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <h3>{coupon.category} Meal Coupon</h3>
                                            
                                            <div className="qr-wrapper" style={{ margin: "20px auto", textAlign: "center" }}>
                                                <QRCodeCanvas
                                                    value={coupon.coupon_code}
                                                    size={180}
                                                />
                                            </div>

                                            <div className="coupon-details">
                                                <div className="detail-row">
                                                    <span>Order ID</span>
                                                    <strong>ORD{coupon.order_id}</strong>
                                                </div>
                                                <div className="detail-row">
                                                    <span>Coupon Code</span>
                                                    <strong style={{ color: "#3b82f6" }}>{coupon.coupon_code}</strong>
                                                </div>
                                                <div className="detail-row">
                                                    <span>Items</span>
                                                    <strong>{coupon.items || "Meal Items"}</strong>
                                                </div>
                                                <div className="detail-row">
                                                    <span>Amount Paid</span>
                                                    <strong>₹{parseFloat(coupon.total_amount).toFixed(2)}</strong>
                                                </div>
                                                <div className="detail-row">
                                                    <span>Date Generated</span>
                                                    <strong>{new Date(coupon.created_at).toLocaleDateString()}</strong>
                                                </div>
                                                <div className="detail-row">
                                                    <span>Status</span>
                                                    <strong className="active-status">AWAITING REDEMPTION</strong>
                                                </div>
                                            </div>

                                            {/* BUTTONS */}
                                            <div className="button-group" style={{ display: "flex", gap: "10px", marginTop: "15px", justifyContent: "center" }}>
                                                {user?.username === "admin" ? (
                                                    <button
                                                        className="download-btn"
                                                        style={{ background: "#7c3aed", color: "white", padding: "10px 20px", display: "flex", alignItems: "center", gap: "8px", border: "none", borderRadius: "8px", cursor: "pointer" }}
                                                        onClick={() => handlePrint(coupon)}
                                                    >
                                                        <FaPrint />
                                                        Print Coupon
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="download-btn"
                                                        style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: "8px", border: "none", borderRadius: "8px", cursor: "pointer" }}
                                                        onClick={() => handlePrint(coupon)}
                                                    >
                                                        <FaDownload />
                                                        Print/Save Coupon
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                    )}
                </div>

                {/* HIDDEN PRINT CONTAINER */}
                {selectedPrintCoupon && (
                    <div className="print-area" style={{ display: "none" }}>
                        <div style={{ padding: "20px", border: "2px dashed #000", borderRadius: "10px", width: "280px", margin: "20px auto", textAlign: "center", fontFamily: "monospace" }}>
                            <h2 style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "bold" }}>eCANTEEN MEAL COUPON</h2>
                            <p style={{ margin: "0 0 10px 0", fontSize: "10px" }}>Office of the PAG (A&E) West Bengal</p>
                            <div style={{ borderBottom: "1px dashed #000", marginBottom: "10px" }}></div>
                            <p style={{ margin: "4px 0", fontSize: "11px" }}>Order ID: <strong>ORD{selectedPrintCoupon.order_id}</strong></p>
                            <p style={{ margin: "4px 0", fontSize: "11px" }}>Employee Name: <strong>{selectedPrintCoupon.full_name}</strong></p>
                            <p style={{ margin: "6px 0", fontSize: "12px" }}>Item: <strong>{selectedPrintCoupon.items}</strong></p>
                            <p style={{ margin: "4px 0", fontSize: "11px" }}>Amount: <strong>₹{parseFloat(selectedPrintCoupon.total_amount).toFixed(2)}</strong></p>
                            <p style={{ margin: "4px 0", fontSize: "11px" }}>Mode: <strong>AWAITING REDEMPTION</strong></p>
                            <div style={{ borderBottom: "1px dashed #000", margin: "10px 0" }}></div>
                            <h3 style={{ margin: "10px 0", fontSize: "15px", letterSpacing: "1px", fontWeight: "bold" }}>{selectedPrintCoupon.coupon_code}</h3>
                            <div style={{ margin: "10px auto", display: "flex", justifyContent: "center" }}>
                                <QRCodeCanvas value={selectedPrintCoupon.coupon_code} size={120} />
                            </div>
                            <p style={{ fontSize: "9px", color: "#444" }}>Date: {new Date(selectedPrintCoupon.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                )}

                {/* FOOTER */}
                <div className="bottom-footer">
                    {user?.username !== "admin" && (
                        <div
                            className="footer-item"
                            onClick={() => navigate("/home")}
                        >
                            <FaHome />
                            <span>Home</span>
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

                    {user?.username !== "admin" && (
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
            </div>
        </div>
    );
}

export default Coupon;