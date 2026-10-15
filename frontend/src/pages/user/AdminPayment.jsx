import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUser, FaClipboardList, FaTicketAlt, FaWallet, FaSignOutAlt, FaHome } from "react-icons/fa";
import axios from "axios";
import "./Payment.css"; // Reuse the beautiful Payment styling

function AdminPayment() {
    const location = useLocation();
    const navigate = useNavigate();

    const cartItems = location.state?.cartItems || [];
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const isCashier = user?.role === "CASHIER" || user?.username === "admin";

    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutToken] = useState(() => {
        return location.state?.checkoutToken || "CHK_" + (user.employee_id || "GUEST") + "_" + Date.now() + "_" + Math.floor(100000 + Math.random() * 900000);
    });

    const totalItems = cartItems.reduce(
        (sum, item) => sum + (item.selectedQty || 0),
        0
    );

    const totalAmount = cartItems.reduce(
        (sum, item) => sum + Number(item.price) * (item.selectedQty || 0),
        0
    );

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <div className="payment-page">
            <div className="payment-main-card">
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
                <div className="payment-content">
                    <button
                        className="back-button"
                        onClick={() => navigate(-1)}
                    >
                        <FaArrowLeft />
                        Back
                    </button>

                    <div className="payment-title">
                        <h2>Admin Counter Checkout</h2>
                        <p>
                            Operator: {user?.full_name} ({user?.username})
                        </p>
                    </div>

                    {/* ORDER SUMMARY */}
                    <div className="payment-card">
                        <h3>Order Summary</h3>
                        {cartItems.length > 0 ? (
                            cartItems.map((item) => (
                                <div className="info-row" key={item.id}>
                                    <span>
                                        {item.name} x {item.selectedQty}
                                    </span>
                                    <strong>
                                        ₹{Number(item.price) * item.selectedQty}
                                    </strong>
                                </div>
                            ))
                        ) : (
                            <div className="info-row">
                                <span>No items selected</span>
                            </div>
                        )}

                        <div className="info-row total-row">
                            <span>Total Items</span>
                            <strong>{totalItems}</strong>
                        </div>

                        <div className="info-row total-row">
                            <span>Total Amount</span>
                            <strong>₹{totalAmount}</strong>
                        </div>
                    </div>

                    {/* PAYMENT METHOD */}
                    <div className="payment-card">
                        <h3>Select Payment Method</h3>
                        <label className="payment-option">
                            <input
                                type="radio"
                                checked={paymentMethod === "Cash"}
                                onChange={() => setPaymentMethod("Cash")}
                            />
                            Cash Payment
                        </label>
                        <label className="payment-option">
                            <input
                                type="radio"
                                checked={paymentMethod === "Scan QR"}
                                onChange={() => setPaymentMethod("Scan QR")}
                            />
                            Scan QR Code
                        </label>
                    </div>

                    {/* PAYMENT DETAILS */}
                    <div className="payment-card">
                        <h3>Payment Details</h3>
                        <div className="info-row">
                            <span>Payment Mode</span>
                            <strong>{paymentMethod}</strong>
                        </div>
                        <div className="info-row">
                            <span>Amount To Pay</span>
                            <strong>₹{totalAmount}</strong>
                        </div>
                    </div>

                    {/* PAY BUTTON */}
                    <div className="payment-bottom-action">
                        <button
                            className="pay-btn"
                            disabled={isProcessing}
                            onClick={async () => {
                                if (cartItems.length === 0) {
                                    alert("Cart is empty!");
                                    return;
                                }
                                if (isProcessing) return;

                                setIsProcessing(true);
                                try {
                                    const category = location.state?.mealType
                                        ? (location.state.mealType.charAt(0).toUpperCase() + location.state.mealType.slice(1).toLowerCase())
                                        : (cartItems[0]?.category || "Lunch");
                                    const orderPayload = {
                                        employee_id: user.employee_id,
                                        category,
                                        total_amount: totalAmount,
                                        payment_mode: paymentMethod,
                                        checkout_token: checkoutToken,
                                        items: cartItems.map(item => ({
                                            item_id: item.id,
                                            item_name: item.name,
                                            quantity: item.selectedQty,
                                            price: Number(item.price)
                                        }))
                                    };

                                    // 1. Create order on backend (idempotent)
                                    const orderRes = await axios.post((window.API_BASE_URL || "http://localhost:5000") + "/api/orders/create", orderPayload);

                                    if (!orderRes.data.success) {
                                        alert("Failed to create order on server.");
                                        setIsProcessing(false);
                                        return;
                                    }

                                    const { order_id, coupon_code } = orderRes.data;

                                    // 2. Record payment (idempotent)
                                    const paymentRes = await axios.post((window.API_BASE_URL || "http://localhost:5000") + "/api/payments/create", {
                                        order_id,
                                        employee_id: user.employee_id,
                                        amount: totalAmount,
                                        payment_method: paymentMethod
                                    });

                                    if (!paymentRes.data.success) {
                                        alert("Failed to log payment on server.");
                                        setIsProcessing(false);
                                        return;
                                    }

                                    // 3. Clear cart quantity keys from sessionStorage
                                    Object.keys(sessionStorage).forEach(key => {
                                        if (key.startsWith("qty_")) {
                                            sessionStorage.removeItem(key);
                                        }
                                    });

                                    // 4. Navigate to success page for Tiffin or admin coupon page for other categories
                                    const now = new Date();
                                    if (category.toLowerCase() === "tiffin") {
                                        navigate("/paymentsuccess", {
                                            state: {
                                                cartItems,
                                                totalItems,
                                                totalAmount,
                                                paymentMethod,
                                                user,
                                                verifiedOrderId: order_id,
                                                couponCode: coupon_code,
                                                category,
                                                mealType: location.state?.mealType
                                            }
                                        });
                                    } else {
                                        navigate("/admin-coupon", {
                                            state: {
                                                cartItems,
                                                totalItems,
                                                totalAmount,
                                                paymentMethod,
                                                user,
                                                orderDetails: {
                                                    orderId: `ORD${order_id}`,
                                                    meal: cartItems.map(item => `${item.name} x ${item.selectedQty}`).join(", "),
                                                    amount: `₹${totalAmount}`,
                                                    paymentMode: paymentMethod,
                                                    date: now.toLocaleDateString(),
                                                    time: now.toLocaleTimeString(),
                                                    couponCode: coupon_code
                                                }
                                            }
                                        });
                                    }
                                } catch (err) {
                                    console.error("Admin checkout error:", err);
                                    alert(err.response?.data?.message || "Error processing admin order.");
                                } finally {
                                    setIsProcessing(false);
                                }
                            }}
                        >
                            {isProcessing ? "Processing..." : (location.state?.mealType?.toLowerCase() === "tiffin" ? "Proceed to Pay" : "Proceed to Generate Coupon")}
                        </button>
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

export default AdminPayment;
