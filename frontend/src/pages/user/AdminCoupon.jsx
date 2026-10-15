import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { FaCheckCircle, FaPrint, FaUser, FaClipboardList, FaTicketAlt, FaWallet, FaSignOutAlt, FaHome } from "react-icons/fa";
import { QRCodeCanvas } from "qrcode.react";
import "./Coupon.css"; // Reuse Coupon styling
import "./PaymentSuccess.css"; // Reuse PaymentSuccess styling for clean structures

function AdminCoupon() {
    const navigate = useNavigate();
    const location = useLocation();

    const cartItems = location.state?.cartItems || [];
    const totalAmount = location.state?.totalAmount || 0;
    const paymentMethod = location.state?.paymentMethod || "Cash";
    const user = location.state?.user || JSON.parse(localStorage.getItem("user")) || {};
    const isCashier = user?.role === "CASHIER" || user?.username === "admin";

    const [loading, setLoading] = useState(true);
    const [orderDetails, setOrderDetails] = useState(null);

    useEffect(() => {
        const details = location.state?.orderDetails;
        if (details) {
            setOrderDetails(details);
            setLoading(false);
        } else {
            // Fallback for direct page access
            navigate(user?.role === "ADMIN" ? "/admin" : "/home");
        }
    }, [location.state, navigate]);

    const handlePrintAndRedirect = () => {
        window.print();
        sessionStorage.removeItem("orderCreated");
        navigate("/home"); // Redirect back to home as logged in admin
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    if (loading) {
        return (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "16px" }}>
                Generating Admin Coupon...
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
                        alt="IAAS Logo"
                        className="dept-logo"
                    />
                </div>

                {/* CONTENT */}
                <div className="coupon-content">
                    <div className="coupon-status" style={{ background: "#f0fdf4", color: "#16a34a", padding: "12px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", marginBottom: "20px" }}>
                        <FaCheckCircle />
                        <strong>Admin Coupon Generated Successfully</strong>
                    </div>

                    {/* COUPON CARD */}
                    <div className="coupon-card">
                        <h3>eCanteen Cashier Coupon</h3>

                        <div className="qr-wrapper" style={{ margin: "20px auto", textAlign: "center" }}>
                            {orderDetails?.couponCode && (
                                <QRCodeCanvas
                                    value={orderDetails.couponCode}
                                    size={200}
                                />
                            )}
                        </div>

                        <div className="coupon-details">
                            <div className="detail-row">
                                <span>Order ID</span>
                                <strong>{orderDetails?.orderId || "-"}</strong>
                            </div>
                            <div className="detail-row">
                                <span>Cashier/Operator</span>
                                <strong>{user?.full_name || "Admin"}</strong>
                            </div>
                            <div className="detail-row">
                                <span>Meal Details</span>
                                <strong>{orderDetails?.meal || "-"}</strong>
                            </div>
                            <div className="detail-row">
                                <span>Amount Paid</span>
                                <strong>{orderDetails?.amount || "-"}</strong>
                            </div>
                            <div className="detail-row">
                                <span>Payment Mode</span>
                                <strong>{orderDetails?.paymentMode || "-"}</strong>
                            </div>
                            <div className="detail-row">
                                <span>Coupon Code</span>
                                <strong style={{ color: "#3b82f6" }}>{orderDetails?.couponCode || "-"}</strong>
                            </div>
                            <div className="detail-row">
                                <span>Date & Time</span>
                                <strong>{orderDetails?.date} {orderDetails?.time}</strong>
                            </div>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="button-group" style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "25px" }}>
                        <button
                            className="download-btn"
                            style={{ background: "#7c3aed", color: "white", padding: "12px 24px", borderRadius: "10px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}
                            onClick={handlePrintAndRedirect}
                        >
                            <FaPrint />
                            Print Coupon
                        </button>
                    </div>
                </div>

                {/* HIDDEN PRINT CONTAINER */}
                <div className="print-area" style={{ display: "none" }}>
                    <div style={{ padding: "20px", border: "2px dashed #000", borderRadius: "10px", width: "280px", margin: "20px auto", textAlign: "center", fontFamily: "monospace" }}>
                        <h2 style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "bold" }}>eCANTEEN MEAL COUPON</h2>
                        <p style={{ margin: "0 0 10px 0", fontSize: "10px" }}>Office of the PAG (A&E) West Bengal</p>
                        <div style={{ borderBottom: "1px dashed #000", marginBottom: "10px" }}></div>
                        <p style={{ margin: "4px 0", fontSize: "11px" }}>Order ID: <strong>{orderDetails?.orderId}</strong></p>
                        <p style={{ margin: "4px 0", fontSize: "11px" }}>Cashier: <strong>{user?.full_name}</strong></p>
                        <p style={{ margin: "6px 0", fontSize: "12px" }}>Item: <strong>{orderDetails?.meal}</strong></p>
                        <p style={{ margin: "4px 0", fontSize: "11px" }}>Amount: <strong>{orderDetails?.amount}</strong></p>
                        <p style={{ margin: "4px 0", fontSize: "11px" }}>Mode: <strong>{orderDetails?.paymentMode}</strong></p>
                        <div style={{ borderBottom: "1px dashed #000", margin: "10px 0" }}></div>
                        <h3 style={{ margin: "10px 0", fontSize: "15px", letterSpacing: "1px", fontWeight: "bold" }}>{orderDetails?.couponCode}</h3>
                        <p style={{ fontSize: "9px", color: "#444" }}>Date: {orderDetails?.date} {orderDetails?.time}</p>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="bottom-footer">
                    <div
                        className="footer-item"
                        onClick={() => navigate("/home")}
                    >
                        <FaHome />
                        <span>Home</span>
                    </div>
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
            </div>
        </div>
    );
}

export default AdminCoupon;
