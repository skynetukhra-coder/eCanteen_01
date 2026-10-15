import React, {
    useMemo,
    useState,
    useEffect,
} from "react";

import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import {
    FaArrowLeft,
    FaUser,
    FaClipboardList,
    FaTicketAlt,
    FaWallet,
    FaSignOutAlt,
    FaMinus,
    FaPlus,
    FaHome,
} from "react-icons/fa";

import breakfastBanner from "../../assets/images/breakfast.jpg";
import lunchBanner from "../../assets/images/lunch.jpg";
import snacksBanner from "../../assets/images/snacks.jpg";


import "./MenuDetails.css";

function MenuDetails() {
    const navigate = useNavigate();
    const { mealType } = useParams();

    const user = JSON.parse(localStorage.getItem("user"));

    const [menuItems, setMenuItems] =
        useState([]);

    const menuData = {
        breakfast: {
            title: "Breakfast Menu",
            time: "06:00 AM - 10:00 AM",
            banner: breakfastBanner,
        },

        lunch: {
            title: "Lunch Menu",
            time: "11:30 AM - 02:30 PM",
            banner: lunchBanner,
        },

        tiffin: {
            title: "Tiffin Menu",
            time: "04:00 PM - 06:00 PM",
            banner: snacksBanner,
        },
    };

    const [timeSlots, setTimeSlots] = useState({
        breakfast: "06:00 AM - 10:00 AM",
        lunch: "11:30 AM - 02:30 PM",
        tiffin: "04:00 PM - 06:00 PM"
    });
    const [slotsLoaded, setSlotsLoaded] = useState(false);

    const selectedMenuRaw =
        menuData[mealType?.toLowerCase()];

    const selectedMenu = selectedMenuRaw ? {
        ...selectedMenuRaw,
        time: timeSlots[mealType?.toLowerCase()] || selectedMenuRaw.time
    } : null;

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

    useEffect(() => {
        fetchMenuItems();
    }, [mealType]);

    useEffect(() => {
        axios.get((window.API_BASE_URL || "http://localhost:5000") + "/api/menu/slots/all")
            .then(res => {
                const slots = {};
                res.data.forEach(s => {
                    const key = s.category.toLowerCase() === "snacks" ? "tiffin" : s.category.toLowerCase();
                    slots[key] = `${s.start_time} - ${s.end_time}`;
                });
                setTimeSlots(prev => ({ ...prev, ...slots }));
                setSlotsLoaded(true);
            })
            .catch(err => {
                console.error("Error loading time slots:", err);
                setSlotsLoaded(true);
            });
    }, []);

    useEffect(() => {
        // Removed redirect check to allow employees to view menu items and stocks fainted out of slot
    }, [slotsLoaded, mealType, timeSlots, user, navigate]);

    const fetchMenuItems = async () => {
        try {
            const response = await axios.get(
                `${window.API_BASE_URL}/api/menu/${mealType}`
            );

            setMenuItems(response.data);
            console.log("MENU DATA:", response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const [quantities, setQuantities] = useState({});

    const increaseQty = (id, availableQty) => {
        const isAdmin = user?.role === "ADMIN" || user?.username === "admin";
        const currentQty = quantities[id] || 0;
        if (!isAdmin && currentQty >= Number(availableQty || 0)) {
            alert(`Cannot add more than available stock quantity (${availableQty}).`);
            return;
        }
        if (isAdmin && Number(availableQty || 0) <= 0) {
            alert(`Warning: This item is out of stock (Available quantity: ${availableQty}). Proceeding will drive inventory negative.`);
        }
        setQuantities((prev) => ({
            ...prev,
            [id]: (prev[id] || 0) + 1,
        }));
    };

    const decreaseQty = (id) => {
        setQuantities((prev) => ({
            ...prev,
            [id]:
                (prev[id] || 0) > 0
                    ? prev[id] - 1
                    : 0,
        }));
    };

    const totalItems = useMemo(() => {
        return Object.values(quantities).reduce(
            (a, b) => a + b,
            0
        );
    }, [quantities]);

    const totalAmount = useMemo(() => {
        return menuItems.reduce(
            (sum, item) =>
                sum +
                Number(item.price) *
                (quantities[item.id] || 0),
            0
        );
    }, [quantities, menuItems]);


    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    if (!slotsLoaded) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", fontSize: "18px", fontWeight: "600", color: "#475569" }}>
                Checking time slot restrictions...
            </div>
        );
    }

    if (!selectedMenu) {
        return (
            <div className="menu-error">
                Menu Not Found
            </div>
        );
    }

    return (
        <div className="menu-page">

            <div className="menu-main-card">

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
                            Accountant General (A&E),
                            W.B.
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

                <div className="menu-content">

                    <button
                        className="back-button"
                        onClick={() => navigate(-1)}
                    >
                        <FaArrowLeft />
                        Back
                    </button>

                    <div className="banner-card">
                        <img
                            src={selectedMenu.banner}
                            alt={selectedMenu.title}
                        />
                    </div>

                    <div className="menu-title-section">
                        <h2>{selectedMenu.title}</h2>
                        <p>{selectedMenu.time}</p>
                    </div>

                    {menuItems.map((item) => {
                        const isOutOfStock = Number(item.available_qty || 0) <= 0;
                        const isAdmin = user?.role === "ADMIN" || user?.username === "admin";
                        const slotKey = mealType?.toLowerCase();
                        const isSlotActive = slotsLoaded ? (isAdmin || isTimeInSlot(timeSlots[slotKey])) : false;
                        const isDisabled = (isOutOfStock || !isSlotActive) && !isAdmin;

                        return (
                            <div
                                className={`food-item-card ${isDisabled ? "disabled-item" : ""}`}
                                key={item.id}
                                style={isDisabled ? { opacity: 0.65, filter: "blur(0.4px)", pointerEvents: "none" } : {}}
                            >
                                <div className="food-left">

                                    <img
                                        src={`${window.API_BASE_URL}${item.image_url}`}
                                        alt={item.name}
                                        className="food-item-image"
                                    />

                                    <div>
                                        <h4>{item.name}</h4>

                                        <span>₹{item.price}</span>

                                        <div style={{ color: isOutOfStock ? "#ef4444" : (!isSlotActive ? "#d97706" : "#10b981"), fontSize: "12px", fontWeight: "600", marginTop: "4px" }}>
                                            {isOutOfStock ? "Out of Stock" : (!isSlotActive ? `Slot closed (Stock: ${item.available_qty || 0})` : `Available Stock: ${item.available_qty || 0}`)}
                                        </div>

                                        {isAdmin && isOutOfStock && (
                                            <div style={{ color: "#d97706", fontSize: "11px", fontWeight: "600", marginTop: "2px" }}>
                                                ⚠️ Warning: Stock is {item.available_qty || 0}
                                            </div>
                                        )}
                                    </div>

                                </div>

                                <div className="qty-section">

                                    <button
                                        onClick={() =>
                                            decreaseQty(item.id)
                                        }
                                    >
                                        <FaMinus />
                                    </button>

                                    <span>
                                        {quantities[item.id] || 0}
                                    </span>

                                    <button
                                        onClick={() =>
                                            increaseQty(item.id, item.available_qty)
                                        }
                                    >
                                        <FaPlus />
                                    </button>

                                </div>
                            </div>
                        );
                    })}

                    {totalItems > 0 && (
                        <div className="cart-summary">

                            <h3>
                                Items Selected : {totalItems}
                            </h3>

                            <h2>
                                Total Amount : ₹{totalAmount}
                            </h2>

                            <button
                                className="cart-btn"
                                onClick={() => {

                                    const cartItems = menuItems
                                        .filter(
                                            (item) =>
                                                (quantities[item.id] || 0) > 0
                                        )
                                        .map((item) => ({
                                            ...item,
                                            selectedQty:
                                                quantities[item.id],
                                        }));

                                    const checkoutToken = "CHK_" + (user.employee_id || "GUEST") + "_" + Date.now() + "_" + Math.floor(100000 + Math.random() * 900000);

                                    navigate(user?.username === "admin" ? "/admin-payment" : "/payment", {
                                        state: {
                                            cartItems,
                                            totalItems,
                                            totalAmount,
                                            mealType,
                                            checkoutToken
                                        },
                                    });
                                }}
                            >
                                Add To Cart
                            </button>

                        </div>
                    )}

                </div>

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

                    {user?.username !== "admin" && (
                        <div
                            className="footer-item"
                            onClick={() =>
                                navigate("/wallet")
                            }
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

export default MenuDetails;