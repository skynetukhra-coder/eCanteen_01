import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
    FaBell,
    FaBoxOpen,
    FaBuilding,
    FaCalendarAlt,
    FaChartLine,
    FaClipboardList,
    FaCog,
    FaCreditCard,
    FaDownload,
    FaFileAlt,
    FaHeadset,
    FaHome,
    FaLandmark,
    FaKey,
    FaMoneyBillWave,
    FaQrcode,
    FaReceipt,
    FaSearch,
    FaSignOutAlt,
    FaStore,
    FaUsers,
    FaUtensils,
    FaWallet,
    FaCommentDots,
} from "react-icons/fa";
import {
    ResponsiveContainer,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    Area,
    PieChart,
    XAxis,
    YAxis,
    Tooltip
} from "recharts";

import breakfastImg from "../../assets/breakfast/poha.jpg";
import lunchVegImg from "../../assets/lunch/paneer.jpg";
import lunchNonVegImg from "../../assets/lunch/thali.jpg";
import snacksImg from "../../assets/snacks/samosa.jpg";
import "./AdminDashboard.css";
import MenuManagement from "./MenuManagement";
import Store from "../admin/Store";
import Cashbook from "../admin/Cashbook";
import OrdersManagement from "../admin/OrdersManagement";
import WalletManagement from "./WalletManagement";
import AdminPayments from "./AdminPayments";
import AuditLogs from "./AuditLogs";
import UserManagement from "./UserManagement";
import AdminFeedback from "./AdminFeedback";


const blue = "#0b63f6";
const green = "#22b24c";
const orange = "#ff9f1c";
const pink = "#ff3d86";
const purple = "#6d28d9";

const sidebarItems = [
    { label: "Dashboard", icon: FaHome, path: "/admin" },
    { label: "Menu Management", icon: FaUtensils, path: "/admin/menu" },
    { label: "Orders Management", icon: FaClipboardList, path: "/admin/orders" },
    { label: "Payments", icon: FaMoneyBillWave, path: "/admin/payments" },
    {
        label: "Wallet Management",
        icon: FaWallet,
        path: "/admin/wallet"
    },
    { label: "Users / Employees", icon: FaUsers, path: "/admin/users" },
    { label: "Store / Inventory", icon: FaBoxOpen, path: "/admin/store-inventory" },

    { label: "Cashbook", icon: FaWallet, path: "/admin/cashbook" },
    { label: "Feedback", icon: FaCommentDots, path: "/admin/feedback" },
    { label: "Notifications", icon: FaBell, path: "/admin/notifications", badge: "8" },
    { label: "Change Password", icon: FaKey, path: "/admin/change-password" },
    { label: "Audit Logs", icon: FaFileAlt, path: "/admin/audit-logs" },
];

const kpis = [
    { label: "Total Users", value: "1,000", sub: "/ 1,000", note: "Daily Limit", icon: FaUsers, color: blue, progress: 100 },
    { label: "Total Orders Today", value: "982", note: "98.2% of limit", icon: FaClipboardList, color: green },
    { label: "Coupons Issued", value: "982", note: "98.2%", icon: FaQrcode, color: purple },
    { label: "Total Collection", value: "₹1,25,840", note: "Today", icon: FaWallet, color: "#f97316" },
    { label: "UPI Transactions", value: "978", note: "Success", icon: FaCreditCard, color: blue },
    { label: "Meals Served", value: "965", note: "Till Now", icon: FaUtensils, color: green },
];

const orderTrend = [
    { time: "06 AM", orders: 45 },
    { time: "08 AM", orders: 120 },
    { time: "10 AM", orders: 210 },
    { time: "12 PM", orders: 380 },
    { time: "02 PM", orders: 523 },
    { time: "04 PM", orders: 700 },
    { time: "06 PM", orders: 845 },
    { time: "08 PM", orders: 982 },
];

const mealDistribution = [
    { name: "Breakfast", value: 280, percent: "28.5%", color: blue },
    { name: "Lunch Veg", value: 337, percent: "34.3%", color: "#37a1ff" },
    { name: "Lunch Non-Veg", value: 166, percent: "16.9%", color: orange },
    { name: "Tiffin", value: 179, percent: "18.2%", color: "#27c56f" },
    { name: "Dinner", value: 0, percent: "0%", color: purple },
];

const todayMenu = [
    { meal: "Breakfast", slot: "06:00 AM - 10:00 AM", image: breakfastImg },
    { meal: "Lunch", slot: "11:30 AM - 02:30 PM", image: lunchVegImg },
    { meal: "Tiffin", slot: "04:00 PM - 06:00 PM", image: snacksImg },
];

const todayDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

const recentOrders = [
    [
        "ORD270526-0982",
        "Amit Kumar",
        "Finance",
        "Lunch - Veg",
        todayDate,
        "11:43 AM",
        "Paid",
        "₹80",
        "UPI"
    ],
    [
        "ORD270526-0981",
        "Neha Singh",
        "Railways",
        "Breakfast",
        todayDate,
        "11:42 AM",
        "Paid",
        "₹30",
        "UPI"
    ],
    [
        "ORD270526-0980",
        "Rajesh Verma",
        "Defence",
        "Lunch Non-Veg",
        todayDate,
        "11:41 AM",
        "Paid",
        "₹120",
        "UPI"
    ],
    [
        "ORD270526-0979",
        "Priya Sharma",
        "HR",
        "Snacks",
        todayDate,
        "11:40 AM",
        "Paid",
        "₹20",
        "UPI"
    ],
    [
        "ORD270526-0978",
        "Sandeep Yadav",
        "Accounts",
        "Lunch - Veg",
        todayDate,
        "11:39 AM",
        "Paid",
        "₹80",
        "UPI"
    ],
];

const activities = [
    ["New Order Placed", "Amit Kumar - Lunch Veg", "11:43 AM", FaClipboardList, green],
    ["Payment Successful", "₹80 via UPI - Google Pay", "11:42 AM", FaWallet, blue],
    ["Coupon Generated", "Token: LUN270526-0982", "11:42 AM", FaQrcode, orange],
    ["Meal Served", "Token: LUN270526-0976", "11:41 AM", FaUtensils, green],
    ["Menu Updated", "Lunch Menu Changed", "10:35 AM", FaCog, purple],
    ["User Registered", "Neha Verma (Finance Dept)", "09:20 AM", FaUsers, blue],
];

const monthlyCollection = [
    { day: "May 21", amount: 85000 },
    { day: "May 22", amount: 112000 },
    { day: "May 23", amount: 135000 },
    { day: "May 24", amount: 121000 },
    { day: "May 25", amount: 153000 },
    { day: "May 27", amount: 170000 },
];

const sectionData = {



    orders: {
        title: "Orders Management",
        icon: FaClipboardList,
        description:
            "Track live orders, payment status, pickup slots and completed meal transactions.",

        metrics: [
            ["Orders Today", "982"],
            ["Completed", "965"],
            ["Pending Pickup", "17"],
        ],

        columns: [
            "Order ID",
            "Employee",
            "Department",
            "Meal",
            "Date",
            "Created At",
            "Status",
            "Amount",
            "Payment Mode",
        ],

        rows: recentOrders,

        action: "Export Orders",
    },
    coupons: {
        title: "Coupons",
        icon: FaQrcode,
        description: "Issue QR coupons, monitor token validity, and manage counter redemption.",
        metrics: [["Issued", "982"], ["Redeemed", "965"], ["Remaining", "18"]],
        columns: ["Token", "Employee", "Meal", "Pickup", "Status"],
        rows: [
            ["LUN270526-0982", "Amit Kumar", "Lunch Veg", "12:30 PM", "Valid"],
            ["BRK270526-0021", "Neha Singh", "Breakfast", "08:30 AM", "Used"],
            ["SNK260526-0187", "Rajesh Verma", "Snacks", "04:30 PM", "Used"],
        ],
        action: "Generate Coupon",
    },
    payments: {
        title: "UPI Payments",
        icon: FaMoneyBillWave,
        description: "Review successful UPI transactions, refunds, failed payments, and settlements.",
        metrics: [["Success", "978"], ["Failed", "0"], ["Collection", "₹1,22,630"]],
        columns: ["Transaction ID", "Employee", "Method", "Amount", "Status"],
        rows: [
            ["UPI270526-982", "Amit Kumar", "Google Pay", "₹80", "Success"],
            ["UPI270526-981", "Neha Singh", "PhonePe", "₹30", "Success"],
            ["UPI270526-980", "Rajesh Verma", "BHIM UPI", "₹120", "Success"],
        ],
        action: "Download Settlement",
    },
    users: {
        title: "Users / Employees",
        icon: FaUsers,
        description: "Register employees, verify department mapping, and manage account status.",
        metrics: [["Total Users", "1,000"], ["Active", "982"], ["Blocked", "0"]],
        columns: ["Photo", "Employee ID", "Name", "Department", "Mobile", "Status"],
        rows: [
            ["https://ui-avatars.com/api/?name=Amit+Kumar&background=0b63f6&color=fff", "CG123456", "Amit Kumar", "Ministry of Finance", "9876543210", "Active"],
            ["https://ui-avatars.com/api/?name=Neha+Singh&background=0b63f6&color=fff", "CG123457", "Neha Singh", "Ministry of Railways", "9876500011", "Active"],
            ["https://ui-avatars.com/api/?name=Priya+Sharma&background=0b63f6&color=fff", "CG123458", "Priya Sharma", "Dept. of Defence", "9876500012", "Active"],
        ],
        action: "Register User",
    },
    departments: {
        title: "Departments",
        icon: FaBuilding,
        description: "Maintain office departments and compare canteen usage department-wise.",
        metrics: [["Departments", "14"], ["Top Dept.", "Finance"], ["Orders", "238"]],
        columns: ["Department", "Office", "Users", "Orders", "Status"],
        rows: [
            ["Ministry of Finance", "North Block", "245", "238", "Active"],
            ["Ministry of Railways", "Rail Bhawan", "210", "196", "Active"],
            ["Dept. of Defence", "South Block", "176", "141", "Active"],
        ],
        action: "Add Department",
    },
    counters: {
        title: "Canteen Counters",
        icon: FaStore,
        description: "Monitor counters, active queues, staff assignment, and scan activity.",
        metrics: [["Counters", "3"], ["Active Orders", "962"], ["Staff Online", "8"]],
        columns: ["Counter", "Staff", "Queue", "Served", "Status"],
        rows: [
            ["Main Canteen Counter 1", "Ramesh", "32", "430", "Active"],
            ["Annex Canteen Counter 2", "Kavita", "21", "312", "Active"],
            ["Evening Counter 3", "Imran", "8", "220", "Active"],
        ],
        action: "Assign Staff",
    },
    inventory: {
        title: "Inventory",
        icon: FaBoxOpen,
        description: "Track ingredients and supplies used for daily meals.",
        metrics: [["Items", "48"], ["Low Stock", "4"], ["Updated", "Today"]],
        columns: ["Item", "Category", "Stock", "Reorder Level", "Status"],
        rows: [
            ["Rice", "Grains", "85 kg", "25 kg", "Available"],
            ["Paneer", "Dairy", "12 kg", "15 kg", "Low"],
            ["Tea", "Beverage", "38 kg", "10 kg", "Available"],
        ],
        action: "Update Stock",
    },
    reports: {
        title: "Reports & Analytics",
        icon: FaChartLine,
        description: "View collection trends, meal demand, department usage, and payment mix.",
        metrics: [["Collection", "₹1,25,840"], ["Utilization", "98.2%"], ["Top Meal", "Lunch Veg"]],
        columns: ["Report", "Period", "Generated By", "Status", "Action"],
        rows: [
            ["Daily Collection", todayDate, "Admin", "Ready", "Download"],
            ["Meal Demand", "This Week", "Admin", "Ready", "Download"],
            ["Department Usage", "This Month", "Admin", "Ready", "Download"],
        ],
        action: "Generate Report",
    },
    notifications: {
        title: "Notifications",
        icon: FaBell,
        description: "Send order updates, menu alerts, payment notices, and broadcast messages.",
        metrics: [["Announcements", "0"], ["Special Menus", "0"], ["Total Broadcasts", "0"]],
        columns: ["Notification ID", "Type", "Title", "Details", "Date", "Bulletin", "Action"],
        rows: [],
        action: "Send Notice",
    },
    settings: {
        title: "Settings",
        icon: FaCog,
        description: "Configure coupon limits, pickup slots, roles, and payment preferences.",
        metrics: [["Coupon Limit", "1,000"], ["Pickup Slots", "12"], ["Roles", "4"]],
        columns: ["Setting", "Current Value", "Owner", "Updated", "Status"],
        rows: [
            ["Daily Coupon Limit", "1,000", "Super Admin", todayDate, "Active"],
            ["Default Pickup Slot", "12:30 PM", "Admin", todayDate, "Active"],
            ["UPI Gateway", "Enabled", "Finance", todayDate, "Active"],
        ],
        action: "Save Settings",
    },
    "audit-logs": {
        title: "Audit Logs",
        icon: FaFileAlt,
        description: "Review administrative activity with module, actor, and timestamp trail.",
        metrics: [["Events Today", "126"], ["Admins", "3"], ["Risk Alerts", "0"]],
        columns: ["Log ID", "User", "Action", "Module", "Time"],
        rows: [
            ["LOG-1028", "Admin", "Updated lunch menu", "Menu", "10:35 AM"],
            ["LOG-1027", "Admin", "Generated report", "Reports", "10:10 AM"],
            ["LOG-1026", "Staff", "Redeemed coupon", "Counters", "09:58 AM"],
        ],
        action: "Export Logs",
    },
    support: {
        title: "Support / Help",
        icon: FaHeadset,
        description: "Track help requests from employees, counters, and department admins.",
        metrics: [["Open Tickets", "5"], ["Resolved", "42"], ["Avg Time", "18m"]],
        columns: ["Ticket", "Raised By", "Issue", "Priority", "Status"],
        rows: [
            ["SUP-201", "Amit Kumar", "Coupon not visible", "Medium", "Open"],
            ["SUP-202", "Counter 1", "Scanner sync delay", "High", "In Progress"],
            ["SUP-203", "Neha Singh", "Payment receipt needed", "Low", "Resolved"],
        ],
        action: "Create Ticket",
    },
};

function AdminDashboard() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const sectionKey =
        pathname.split("/").filter(Boolean)[1] || "dashboard";
    const isDashboard = sectionKey === "dashboard" || pathname === "/admin";
    const [searchQuery, setSearchQuery] = useState("");

    const getTodayStr = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const [selectedDate, setSelectedDate] = useState(getTodayStr);

    // Dynamic notifications count logic
    const [adminNotifications, setAdminNotifications] = useState([]);
    const [lastViewedAdminNotifId, setLastViewedAdminNotifId] = useState(
        parseInt(localStorage.getItem("lastViewedAdminNotifId") || "0")
    );

    useEffect(() => {
        axios.get((window.API_BASE_URL || "http://localhost:5000") + "/api/notifications/list")
            .then(res => {
                setAdminNotifications(res.data);
            })
            .catch(err => console.error("Error loading admin notifications:", err));
    }, [pathname]);

    const adminUnreadCount = useMemo(() => {
        return adminNotifications.filter(n => n.id > lastViewedAdminNotifId).length;
    }, [adminNotifications, lastViewedAdminNotifId]);

    const clearAdminUnread = () => {
        if (adminNotifications.length > 0) {
            const maxId = Math.max(...adminNotifications.map(n => n.id));
            localStorage.setItem("lastViewedAdminNotifId", String(maxId));
            setLastViewedAdminNotifId(maxId);
        }
    };

    useEffect(() => {
        if (pathname === "/admin/notifications") {
            clearAdminUnread();
        }
    }, [pathname, adminNotifications]);

    const goTo = (path) => navigate(path);

    return (
        <div className="ec-admin">
            <aside className="ec-sidebar">
                <div className="ec-emblem" style={{ background: "#fff", display: "flex", justifyContent: "center", alignItems: "center", height: "86px", padding: "10px", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>
                    <img src="/images/IA&AS_Logo.png" alt="IA&AS Logo" style={{ height: "65px", width: "auto", objectFit: "contain" }} />
                </div>
                <div className="ec-profile">
                    <div className="ec-avatar">A</div>
                    <div>
                        <strong>Admin</strong>
                        <span>Super Administrator</span>
                        <small><i /> Online</small>
                    </div>
                </div>
                <nav className="ec-nav">
                    {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        const active = item.path === "/admin" ? isDashboard : pathname.startsWith(item.path);
                        let badgeValue = item.badge;
                        if (item.label === "Notifications") {
                            badgeValue = adminUnreadCount > 0 ? String(adminUnreadCount) : null;
                        }
                        return (
                            <button className={active ? "active" : ""} key={item.path} onClick={() => goTo(item.path)}>
                                <Icon />
                                <span>{item.label}</span>
                                {badgeValue && <b>{badgeValue}</b>}
                            </button>
                        );
                    })}
                </nav>
                <button className="ec-logout" onClick={() => { localStorage.clear(); goTo("/login"); }}>
                    <FaSignOutAlt />
                    <span>Logout</span>
                </button>
            </aside>
            <div className="ec-workspace">
                <TopBar 
                    searchQuery={searchQuery} 
                    setSearchQuery={setSearchQuery} 
                    adminUnreadCount={adminUnreadCount}
                    clearAdminUnread={clearAdminUnread}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                />

                {isDashboard ? (
                    <DashboardHome navigate={goTo} searchQuery={searchQuery} selectedDate={selectedDate} />
                ) : sectionKey === "menu" ? (
                    <MenuManagement searchQuery={searchQuery} />
                ) : sectionKey === "orders" ? (
                    <OrdersManagement searchQuery={searchQuery} />
                ) : sectionKey === "users" ? (
                    <UserManagement searchQuery={searchQuery} />
                ) : sectionKey === "wallet" ? (

                    <WalletManagement />
                ) : sectionKey === "store-inventory" ? (
                    <Store />
                ) : sectionKey === "cashbook" ? (
                    <Cashbook />
                ) : sectionKey === "payments" ? (
                    <AdminPayments />
                ) : sectionKey === "audit-logs" ? (
                    <AuditLogs />
                ) : sectionKey === "feedback" ? (
                    <AdminFeedback />
                ) : sectionKey === "change-password" ? (
                    <ChangePassword />
                ) : sectionKey === "settings" ? (
                    <SettingsManagement />
                ) : (
                    <AdminSection
                        sectionKey={sectionKey}
                        searchQuery={searchQuery}
                    />
                )}
            </div>
        </div>
    );
}

function TopBar({ searchQuery, setSearchQuery, adminUnreadCount, clearAdminUnread, selectedDate, setSelectedDate }) {
    const navigate = useNavigate();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const activeDate = selectedDate ? new Date(selectedDate) : time;
    const dateStr = activeDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

    const dayTimeStr = selectedDate 
        ? `${activeDate.toLocaleDateString("en-GB", { weekday: "long" })} (Historical View)`
        : `${time.toLocaleDateString("en-GB", { weekday: "long" })}, ${time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;

    return (
        <header className="ec-topbar">
            <div className="ec-title">
                <h1>eCanteen Admin Dashboard</h1>
                <p>Central Government Canteen - Food Coupon & Ordering System</p>
            </div>
            <label className="ec-search">
                <input 
                    placeholder="Search Employee / Order / Coupon..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <FaSearch />
            </label>
            <div className="ec-actions">
                <button className="ec-icon-button" onClick={() => {
                    navigate("/admin/notifications");
                    clearAdminUnread();
                }}>
                    <FaBell />
                    {adminUnreadCount > 0 && <span>{adminUnreadCount}</span>}
                </button>
                <button className="ec-icon-button" onClick={() => navigate("/admin/audit-logs")}>
                    <FaReceipt />
                </button>
                <div className="ec-user" style={{ cursor: "pointer" }} onClick={() => navigate("/admin/settings")}>
                    <div className="ec-mini-avatar">A</div>
                    <span><strong>Admin</strong><small>Super Administrator</small></span>
                </div>
                <div className="ec-date">
                    <strong>{dateStr}</strong>
                    <small>{dayTimeStr}</small>
                </div>
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                    <FaCalendarAlt className="calendar-icon" style={{ cursor: "pointer" }} />
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            opacity: 0,
                            width: "100%",
                            height: "100%",
                            cursor: "pointer"
                        }}
                    />
                </div>
            </div>
        </header>
    );
}


function DashboardHome({ navigate, searchQuery = "", selectedDate }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        axios.get((window.API_BASE_URL || "http://localhost:5000") + `/api/admin-stats/dashboard?date=${selectedDate}`)
            .then(res => {
                if (res.data.success) {
                    setData(res.data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Error loading dashboard data:", err);
                setLoading(false);
            });
    }, [selectedDate]);

    if (loading) {
        return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading dashboard stats...</div>;
    }

    const dailyLimit = Number(localStorage.getItem("setting_daily_limit") || 1000);
    const totalUsersLimit = Number(localStorage.getItem("setting_total_users_limit") || 1000);

    const currentKPIs = kpis.map((kpi, index) => {
        if (!data?.kpis || !data.kpis[index]) return kpi;
        const backendKpi = data.kpis[index];
        if (index === 0) {
            const val = Number(backendKpi.value) || 0;
            return {
                ...kpi,
                value: backendKpi.value,
                sub: `/ ${totalUsersLimit}`,
                note: backendKpi.note,
                progress: Math.min((val / totalUsersLimit) * 100, 100)
            };
        }
        return {
            ...kpi,
            value: backendKpi.value,
            note: backendKpi.note,
            progress: backendKpi.progress
        };
    });

    const currentOrderTrend = data?.orderTrend || orderTrend;
    const currentMealDistribution = data?.mealDistribution || mealDistribution;
    const currentRecentOrders = data?.recentOrders || recentOrders;
    const currentActivities = data?.activities || activities;

    // Filter recent orders by search query if any
    const filteredRecentOrders = currentRecentOrders.filter(row => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return row.some(cell => String(cell).toLowerCase().includes(query));
    });

    const totalOrdersToday = data?.kpis?.[1]?.value || "0";
    const totalCollectionTodayVal = data?.kpis?.[3]?.value || "₹0.00";
    const totalUPICollection = data?.kpis?.[4]?.value || "0";
    const mealsServed = data?.kpis?.[5]?.value || "0";

    const breakfastVal = currentMealDistribution.find(m => m.name === "Breakfast")?.value || 0;
    const lunchVal = currentMealDistribution.find(m => m.name.includes("Lunch"))?.value || 0;
    const snacksVal = currentMealDistribution.find(m => m.name === "Tiffin" || m.name === "Snacks")?.value || 0;
    const dinnerVal = currentMealDistribution.find(m => m.name === "Dinner")?.value || 0;

    const todayDate = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

    const todayDayOfWeek = new Date().toLocaleDateString("en-GB", {
        weekday: "long"
    });

    const todayTime = new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
    });

    return (
        <main className="ec-dashboard">
            <section className="ec-kpis">
                {currentKPIs.map((card) => {
                    const Icon = card.icon;
                    return (
                        <article className="ec-kpi" key={card.label}>
                            <div className="ec-kpi-icon" style={{ color: card.color, background: `${card.color}15` }}>
                                <Icon />
                            </div>
                            <div>
                                <small>{card.label}</small>
                                <h2>{card.value} {card.sub && <em>{card.sub}</em>}</h2>
                                <p style={{ color: card.progress ? "#3b82f6" : "#22b24c" }}>{card.note}</p>
                                {card.progress && <div className="thin-progress"><span style={{ width: `${card.progress}%` }} /></div>}
                            </div>
                        </article>
                    );
                })}
                <article className="ec-date-card">
                    <strong>{todayDate}</strong>
                    <span>{todayDayOfWeek}, {todayTime}</span>
                </article>
            </section>

            <section className="ec-dashboard-layout">

                {/* ================= ROW 1 ================= */}

                <div className="dashboard-row row-1">

                    <Panel title="Today's Orders Overview" className="orders-panel">
                        <div className="chart-legend">
                            <span><i style={{ background: orange }} />Breakfast: {breakfastVal}</span>
                            <span><i style={{ background: blue }} />Lunch: {lunchVal}</span>
                            <span><i style={{ background: green }} />Tiffin: {snacksVal}</span>
                            <span><i style={{ background: purple }} />Dinner: {dinnerVal}</span>
                        </div>

                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={currentOrderTrend}>

                                <CartesianGrid
                                    stroke="#e8edf7"
                                    vertical={false}
                                />

                                <XAxis dataKey="time" />

                                <YAxis />

                                <Tooltip />

                                <Line
                                    type="monotone"
                                    dataKey="Breakfast"
                                    stroke={orange}
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: orange }}
                                />

                                <Line
                                    type="monotone"
                                    dataKey="Lunch"
                                    stroke={blue}
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: blue }}
                                />

                                <Line
                                    type="monotone"
                                    dataKey="Tiffin"
                                    stroke={green}
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: green }}
                                />

                                <Line
                                    type="monotone"
                                    dataKey="Dinner"
                                    stroke={purple}
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: purple }}
                                />

                                <Line
                                    type="monotone"
                                    dataKey="orders"
                                    name="Total Orders"
                                    stroke="#94a3b8"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={{ r: 3, fill: "#94a3b8" }}
                                />

                            </LineChart>
                        </ResponsiveContainer>
                    </Panel>

                    <Panel title="Orders by Meal Type">
                        <div className="donut-wrap">
                            <ResponsiveContainer width="54%" height={350}>
                                <PieChart>
                                    <Pie data={currentMealDistribution} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={1}>
                                        {currentMealDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="donut-center" style={{ left: "27%" }}>Total<strong>{totalOrdersToday}</strong></div>
                            <div className="meal-list">
                                {currentMealDistribution.map((item) => (
                                    <span key={item.name}><i style={{ background: item.color }} />{item.name}<b>{item.percent} ({item.value})</b></span>
                                ))}
                            </div>
                        </div>
                    </Panel>

                    <Panel title="Today's Menu" action="Edit Menu" onAction={() => navigate("/admin/menu")}>
                        <div className="menu-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {todayMenu.map((item) => (
                                <div className="menu-line" key={item.meal} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                                    <img src={item.image} alt={item.meal} style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", marginRight: "12px" }} />
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                        <strong style={{ fontSize: "15px", color: "#1e293b", fontWeight: "600" }}>{item.meal}</strong>
                                        <span style={{ fontSize: "12px", color: "#475569", background: "#f8fafc", padding: "4px 12px", borderRadius: "20px", border: "1px solid #e2e8f0", fontWeight: "500" }}>{item.slot}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>

                </div>

                {/* ================= ROW 2 ================= */}

                <div className="dashboard-row row-2">

                    <Panel title={`Daily Coupon Limit (Max ${dailyLimit})`}
                        className="coupon-panel">
                        <div className="coupon-limit">
                            <div className="gauge"><span>{totalOrdersToday}<strong>Issued</strong><small>{dailyLimit} Max</small></span></div>
                            <div className="limit-stats">
                                <span>Remaining<b>{Math.max(0, dailyLimit - Number(totalOrdersToday))}</b></span>
                                <span>Utilization<b>{((Math.min(dailyLimit, Number(totalOrdersToday)) / dailyLimit) * 100).toFixed(1)}%</b></span>
                                <span>Closed<b>0</b></span>
                            </div>
                        </div>
                    </Panel>

                    <Panel
                        className="recent-panel"
                        title="Recent Orders"
                        action="View All"
                        onAction={() => navigate("/admin/orders")}
                    >
                        <DataTable
                            columns={[
                                "Order ID",
                                "Employee",
                                "Department",
                                "Meal",
                                "Date",
                                "Created At",
                                "Status",
                                "Amount",
                                "Payment Mode",
                            ]}
                            rows={filteredRecentOrders}
                            compact
                        />
                    </Panel>

                    <Panel
                        title="Payment Summary"
                        className="payment-summary-panel"
                    >
                        <Summary
                            rows={[
                                ["Total Collection Today", totalCollectionTodayVal],
                                ["UPI Transactions Success", totalUPICollection],
                                ["Meals Served Today", mealsServed],
                                ["Total Orders Today", totalOrdersToday]
                            ]}
                        />
                    </Panel>

                </div>

                {/* ================= ROW 3 ================= */}

                <div className="dashboard-row row-3">

                    <Panel
                        title="Monthly Collection Trend"
                        className="monthly-panel"
                    >
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={monthlyCollection}>
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Bar
                                    dataKey="amount"
                                    fill={green}
                                    radius={[2, 2, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Panel>

                    <Panel
                        title="Payment Methods"
                        className="payment-method-panel"
                    >
                        <MiniDonut
                            rows={[
                                ["UPI", `${(totalOrdersToday > 0 ? (Number(totalUPICollection) / Number(totalOrdersToday)) * 100 : 0).toFixed(1)}% (${totalUPICollection})`, blue],
                                ["Cash", `${(totalOrdersToday > 0 ? (currentRecentOrders.filter(o => o[8] === "Cash").length / Number(totalOrdersToday)) * 100 : 0).toFixed(1)}% (${currentRecentOrders.filter(o => o[8] === "Cash").length})`, "#111827"],
                                ["Wallet/Scan QR", `${(totalOrdersToday > 0 ? (currentRecentOrders.filter(o => o[8] === "Scan QR" || o[8]?.toLowerCase() === "wallet").length / Number(totalOrdersToday)) * 100 : 0).toFixed(1)}% (${currentRecentOrders.filter(o => o[8] === "Scan QR" || o[8]?.toLowerCase() === "wallet").length})`, green],
                                ["Others", "0% (0)", orange],
                            ]}
                        />
                    </Panel>

                    <Panel title="Live Activity Feed" action="View All" onAction={() => navigate("/admin/audit-logs")}>
                        <div className="activity-list">
                            {currentActivities.map(([title, desc, time, severity]) => {
                                const Icon = severity === "CRITICAL" ? FaBell : FaClipboardList;
                                const color = severity === "CRITICAL" ? pink : green;
                                return (
                                    <div className="activity" key={`${title}-${time}`}>
                                        <span style={{ background: `${color}18`, color }}><Icon /></span>
                                        <p><strong>{title}</strong><small>{desc}</small></p>
                                        <em>{time}</em>
                                    </div>
                                );
                            })}
                        </div>
                    </Panel>


                </div>

            </section>
        </main>
    );
}

function AdminSection({ sectionKey, searchQuery = "" }) {
    const section = sectionData[sectionKey] || sectionData.reports;
    const Icon = section.icon;

    const [rows, setRows] = useState([]);
    const [metrics, setMetrics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [localSearch, setLocalSearch] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [noticeType, setNoticeType] = useState("announcement");
    const [noticeTitle, setNoticeTitle] = useState("");
    const [noticeMessage, setNoticeMessage] = useState("");
    const [itemName, setItemName] = useState("");
    const [itemPrice, setItemPrice] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const [showInBulletin, setShowInBulletin] = useState(true);

    const fetchNotificationsList = () => {
        setLoading(true);
        axios.get((window.API_BASE_URL || "http://localhost:5000") + "/api/notifications/list")
            .then(res => {
                const mappedRows = res.data.map(notif => {
                    const details = notif.type === "ANNOUNCEMENT" 
                        ? notif.message 
                        : `${notif.item_name} - ₹${notif.price}`;
                    const formattedDate = new Date(notif.created_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                    });
                    return [
                        `NOTIF-${notif.id}`,
                        notif.type,
                        notif.title,
                        details,
                        formattedDate,
                        { id: notif.id, active: notif.show_in_bulletin === 1 },
                        notif.id // Pass ID to the Action cell
                    ];
                });
                setRows(mappedRows);
                
                const announcements = res.data.filter(n => n.type === "ANNOUNCEMENT").length;
                const specialMenus = res.data.filter(n => n.type === "SPECIAL_MENU").length;
                setMetrics([
                    ["Announcements", String(announcements)],
                    ["Special Menus", String(specialMenus)],
                    ["Total Broadcasts", String(res.data.length)]
                ]);
            })
            .catch(err => console.error("Error fetching notifications:", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        setRows(section.rows || []);
        setMetrics(section.metrics || []);
        setLocalSearch("");

        if (sectionKey === "users") {
            setLoading(true);
            axios.get((window.API_BASE_URL || "http://localhost:5000") + "/api/employee/list")
                .then(res => {
                    const mappedRows = res.data.map(emp => [
                        emp.profile_image ? `${window.API_BASE_URL || "http://localhost:5000"}${emp.profile_image}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=0b63f6&color=fff`,
                        emp.username,
                        emp.full_name,
                        emp.designation || emp.role,
                        emp.mobile || "N/A",
                        emp.role === "ADMIN" ? "Admin" : "Active"
                    ]);
                    setRows(mappedRows);
                    
                    const totalUsers = res.data.length;
                    const activeCount = res.data.filter(e => e.role !== "ADMIN").length;
                    setMetrics([
                        ["Total Users", String(totalUsers)],
                        ["Active Employees", String(activeCount)],
                        ["Blocked", "0"]
                    ]);
                })
                .catch(err => console.error("Error fetching users:", err))
                .finally(() => setLoading(false));
        } else if (sectionKey === "notifications") {
            fetchNotificationsList();
        } else if (sectionKey === "audit-logs") {
            setLoading(true);
            axios.get((window.API_BASE_URL || "http://localhost:5000") + "/api/wallet/audit-logs")
                .then(res => {
                    const mappedRows = res.data.map(log => {
                        let user = "System";
                        if (log.details.toLowerCase().includes("admin")) user = "Admin";
                        else if (log.details.toLowerCase().includes("staff")) user = "Staff";
                        
                        return [
                            `LOG-${log.log_id}`,
                            user,
                            log.details,
                            log.action_name,
                            log.time
                        ];
                    });
                    setRows(mappedRows);

                    const totalEvents = res.data.length;
                    const criticalEvents = res.data.filter(l => l.severity === "CRITICAL").length;
                    setMetrics([
                        ["Events Today", String(totalEvents)],
                        ["Admins Active", "3"],
                        ["Risk Alerts", String(criticalEvents)]
                    ]);
                })
                .catch(err => console.error("Error fetching audit logs:", err))
                .finally(() => setLoading(false));
        } else if (["counters", "reports"].includes(sectionKey)) {
            setLoading(true);
            axios.get(`${window.API_BASE_URL || "http://localhost:5000"}/api/admin-stats/${sectionKey}`)
                .then(res => {
                    setRows(res.data.rows);
                    setMetrics(res.data.metrics);
                })
                .catch(err => console.error(`Error fetching ${sectionKey}:`, err))
                .finally(() => setLoading(false));
        }
    }, [sectionKey]);

    const activeSearch = sectionKey === "users" ? localSearch : searchQuery;

    const filteredRows = rows.filter(row => {
        if (!activeSearch) return true;
        const query = activeSearch.toLowerCase();
        return row.some((cell, idx) => {
            if (sectionKey === "users" && idx === 0) return false;
            if (sectionKey === "notifications" && idx === 5) return false;
            return String(cell).toLowerCase().includes(query);
        });
    });

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("image", file);

        setUploading(true);
        try {
            const res = await axios.post((window.API_BASE_URL || "http://localhost:5000") + "/api/menu/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            if (res.data.success) {
                setImageUrl(res.data.image_url);
            }
        } catch (err) {
            console.error("Image upload failed:", err);
            alert("Image upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const handlePublish = async () => {
        if (!noticeTitle) {
            alert("Title is required.");
            return;
        }

        const payload = {
            type: noticeType === "announcement" ? "ANNOUNCEMENT" : "SPECIAL_MENU",
            title: noticeTitle,
            message: noticeType === "announcement" ? noticeMessage : null,
            item_name: noticeType === "special_menu" ? itemName : null,
            price: noticeType === "special_menu" ? parseFloat(itemPrice) : null,
            image_url: noticeType === "special_menu" ? imageUrl : null,
            show_in_bulletin: showInBulletin
        };

        try {
            const res = await axios.post((window.API_BASE_URL || "http://localhost:5000") + "/api/notifications/publish", payload);
            if (res.data.success) {
                alert("Published successfully!");
                setIsModalOpen(false);
                // Clear fields
                setNoticeTitle("");
                setNoticeMessage("");
                setItemName("");
                setItemPrice("");
                setImageUrl("");
                setShowInBulletin(true);
                // Refresh
                fetchNotificationsList();
            }
        } catch (err) {
            console.error("Publish notification failed:", err);
            alert("Failed to publish notification.");
        }
    };

    const handleDeleteNotification = async (id) => {
        if (!window.confirm("Are you sure you want to delete this broadcast notice?")) return;
        try {
            const res = await axios.delete(`${window.API_BASE_URL || "http://localhost:5000"}/api/notifications/${id}`);
            if (res.data.success) {
                fetchNotificationsList();
            }
        } catch (err) {
            console.error("Failed to delete notification:", err);
            alert("Failed to delete notification.");
        }
    };

    const handleToggleBulletin = async (id, show) => {
        try {
            const res = await axios.put(`${window.API_BASE_URL || "http://localhost:5000"}/api/notifications/${id}/toggle-bulletin`, { show });
            if (res.data.success) {
                fetchNotificationsList();
            }
        } catch (err) {
            console.error("Failed to toggle bulletin status:", err);
            alert("Failed to toggle bulletin status.");
        }
    };

    const handleHeroAction = () => {
        if (sectionKey === "notifications") {
            setIsModalOpen(true);
        }
    };

    return (
        <main className="ec-section-page">
            <section className="section-hero">
                <div className="section-icon"><Icon /></div>
                <div>
                    <h2>{section.title}</h2>
                    <p>{section.description}</p>
                </div>
                {sectionKey === "users" ? (
                    <div className="local-search-wrap">
                        <FaSearch className="local-search-icon" />
                        <input
                            type="text"
                            placeholder="Search employees..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="local-search-input"
                        />
                    </div>
                ) : (
                    <button onClick={handleHeroAction}>{section.action}</button>
                )}
            </section>

            <section className="section-metrics">
                {metrics.map(([label, value]) => (
                    <article key={label}>
                        <small>{label}</small>
                        <strong>{value}</strong>
                    </article>
                ))}
            </section>

            <section className="section-grid">
                <Panel
                    className="section-table full-width-table"
                    title={`${section.title} Records`}
                >
                    {loading ? (
                        <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>Loading records...</div>
                    ) : (
                        <DataTable 
                            columns={section.columns} 
                            rows={filteredRows} 
                            onDeleteNotification={handleDeleteNotification}
                            onToggleBulletin={handleToggleBulletin}
                        />
                    )}
                </Panel>
            </section>

            {isModalOpen && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-card">
                        <div className="admin-modal-header">
                            <h3>Publish Broadcast Notice</h3>
                            <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <div className="admin-modal-body">
                            <div className="modal-tab-headers">
                                <button 
                                    className={noticeType === "announcement" ? "tab-btn active" : "tab-btn"}
                                    onClick={() => setNoticeType("announcement")}
                                >
                                    Announcement
                                </button>
                                <button 
                                    className={noticeType === "special_menu" ? "tab-btn active" : "tab-btn"}
                                    onClick={() => setNoticeType("special_menu")}
                                >
                                    Special Menu
                                </button>
                            </div>

                            <div className="modal-form-content">
                                <div className="form-group">
                                    <label>Title</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter notification title..."
                                        value={noticeTitle}
                                        onChange={(e) => setNoticeTitle(e.target.value)}
                                    />
                                </div>

                                {noticeType === "announcement" ? (
                                    <div className="form-group">
                                        <label>Message</label>
                                        <textarea 
                                            placeholder="Enter announcement message details..."
                                            value={noticeMessage}
                                            onChange={(e) => setNoticeMessage(e.target.value)}
                                            rows={4}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="form-group">
                                            <label>Item Name</label>
                                            <input 
                                                type="text" 
                                                placeholder="Enter food item name..."
                                                value={itemName}
                                                onChange={(e) => setItemName(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Price (₹)</label>
                                            <input 
                                                type="number" 
                                                placeholder="Enter item price..."
                                                value={itemPrice}
                                                onChange={(e) => setItemPrice(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Food Item Photo</label>
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                            />
                                            {uploading && <small className="upload-progress">Uploading image...</small>}
                                            {imageUrl && (
                                                <div className="uploaded-preview">
                                                    <img src={`${window.API_BASE_URL || "http://localhost:5000"}${imageUrl}`} alt="Food preview" />
                                                    <small>Image uploaded successfully</small>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                                <div className="form-group checkbox-group" style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "15px" }}>
                                    <input 
                                        id="show-in-bulletin-check"
                                        type="checkbox" 
                                        checked={showInBulletin}
                                        onChange={(e) => setShowInBulletin(e.target.checked)}
                                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                    />
                                    <label htmlFor="show-in-bulletin-check" style={{ margin: 0, fontWeight: "600", fontSize: "14px", cursor: "pointer", color: "#374151" }}>
                                        Show on rolling bulletin ticker
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="admin-modal-footer">
                            <button className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className="publish-btn" onClick={handlePublish} disabled={uploading}>Publish Broadcast</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

function Panel({ title, action, onAction, className = "", children }) {
    return (
        <article className={`ec-panel ${className}`}>
            <div className="panel-head">
                <h3>{title}</h3>
                {action && <button onClick={onAction}>{action}</button>}
            </div>
            {children}
        </article>
    );
}

function DataTable({ columns, rows, compact = false, onDeleteNotification, onToggleBulletin }) {
    return (
        <div className="table-scroll">
            <table className={compact ? "compact-table" : ""}>
                <thead>
                    <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={row[0] || rowIndex}>
                            {row.map((cell, index) => {
                                const colName = columns[index];
                                return (
                                    <td key={`${index}-${cell?.id || cell}`}>
                                        {colName === "Photo" ? (
                                            <img 
                                                src={cell} 
                                                alt="Profile" 
                                                className="table-profile-photo"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = "https://ui-avatars.com/api/?name=Employee&background=0b63f6&color=fff";
                                                }}
                                            />
                                        ) : colName === "Action" && columns[0] === "Notification ID" ? (
                                            <button 
                                                className="delete-notif-btn"
                                                onClick={() => onDeleteNotification(cell)}
                                            >
                                                Delete
                                            </button>
                                        ) : colName === "Bulletin" && columns[0] === "Notification ID" ? (
                                            <button 
                                                type="button"
                                                className={`toggle-bulletin-btn ${cell?.active ? 'active' : ''}`}
                                                onClick={() => onToggleBulletin(cell.id, !cell.active)}
                                                style={{
                                                    padding: "6px 12px",
                                                    borderRadius: "6px",
                                                    fontSize: "12px",
                                                    fontWeight: "700",
                                                    background: cell?.active ? "#dcfce7" : "#f1f5f9",
                                                    color: cell?.active ? "#15803d" : "#475569",
                                                    border: `1px solid ${cell?.active ? "#bbf7d0" : "#cbd5e1"}`,
                                                    cursor: "pointer",
                                                    transition: "all 0.2s"
                                                }}
                                            >
                                                {cell?.active ? "● Rolling" : "○ Hided"}
                                            </button>
                                        ) : String(cell).match(/Paid|Active|Success|Valid|Ready|Available|Sent/) ? (
                                            <span className="status-pill">{cell}</span>
                                        ) : cell}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Summary({ rows }) {
    return (
        <div className="summary-list">
            {rows.map(([label, value]) => (
                <span key={label}>{label}<strong>{value}</strong></span>
            ))}
        </div>
    );
}

function DepartmentBars() {
    const rows = [
        ["Ministry of Finance", 238, blue],
        ["Ministry of Railways", 196, purple],
        ["Dept. of Defence", 141, green],
        ["Others", 255, orange],
    ];
    return (
        <div className="dept-bars">
            {rows.map(([label, value, color]) => (
                <div key={label}>
                    <span>{label}<b>{value}</b></span>
                    <i><em style={{ width: `${Math.min(value / 2.6, 100)}%`, background: color }} /></i>
                </div>
            ))}
        </div>
    );
}

function MiniDonut({ center, rows }) {
    const data = rows.map(([name, label, color]) => ({ name, value: Number(label.match(/\d+/)?.[0] || 1), color }));
    return (
        <div className="mini-donut">
            <ResponsiveContainer width="48%" height={180}>
                <PieChart>
                    <Pie data={data} dataKey="value" innerRadius={48} outerRadius={72}>
                        {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
            {center && <div className="mini-center">Total<strong>{center}</strong></div>}
            <div className="meal-list compact">
                {rows.map(([name, label, color]) => (
                    <span key={name}><i style={{ background: color }} />{name}<b>{label}</b></span>
                ))}
            </div>
        </div>
    );
}

function ChangePassword() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState({ text: "", isError: false });
    const [submitting, setSubmitting] = useState(false);

    const adminUser = JSON.parse(localStorage.getItem("user")) || {};

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: "", isError: false });

        if (!currentPassword || !newPassword || !confirmPassword) {
            setMessage({ text: "Please fill in all fields.", isError: true });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({ text: "New passwords do not match.", isError: true });
            return;
        }

        if (newPassword.length < 5) {
            setMessage({ text: "New password must be at least 5 characters long.", isError: true });
            return;
        }

        setSubmitting(true);
        try {
            const res = await axios.post((window.API_BASE_URL || "http://localhost:5000") + "/api/auth/change-password", {
                employee_id: adminUser.employee_id || 1,
                current_password: currentPassword,
                new_password: newPassword
            });

            if (res.data.success) {
                setMessage({ text: "Password updated successfully!", isError: false });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                setMessage({ text: res.data.message || "Failed to update password.", isError: true });
            }
        } catch (err) {
            console.error("Password update error:", err);
            setMessage({
                text: err.response?.data?.message || "Error changing password. Ensure current password is correct.",
                isError: true
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="ec-change-password-page" style={{ padding: "40px", maxWidth: "600px", margin: "0 auto" }}>
            <div className="ec-panel" style={{ padding: "30px", borderRadius: "12px", background: "#fff", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "25px", borderBottom: "1px solid #f3f4f6", paddingBottom: "15px" }}>
                    <div style={{ background: "#fef3c7", color: "#d97706", padding: "12px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <FaKey size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#111827" }}>Change Administrator Password</h2>
                        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "2px" }}>Update credentials for the Canteen Super Administrator account</p>
                    </div>
                </div>

                {message.text && (
                    <div style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        marginBottom: "20px",
                        fontSize: "14px",
                        fontWeight: "500",
                        background: message.isError ? "#fee2e2" : "#d1fae5",
                        color: message.isError ? "#b91c1c" : "#065f46",
                        border: `1px solid ${message.isError ? "#fca5a5" : "#6ee7b7"}`
                    }}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Current Password</label>
                        <input
                            type="password"
                            required
                            placeholder="Enter current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            style={{
                                padding: "10px 14px",
                                borderRadius: "8px",
                                border: "1px solid #d1d5db",
                                fontSize: "14px",
                                outline: "none",
                                transition: "border-color 0.15s ease",
                            }}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>New Password</label>
                        <input
                            type="password"
                            required
                            placeholder="Enter new password (min. 5 chars)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            style={{
                                padding: "10px 14px",
                                borderRadius: "8px",
                                border: "1px solid #d1d5db",
                                fontSize: "14px",
                                outline: "none",
                            }}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Confirm New Password</label>
                        <input
                            type="password"
                            required
                            placeholder="Re-enter new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={{
                                padding: "10px 14px",
                                borderRadius: "8px",
                                border: "1px solid #d1d5db",
                                fontSize: "14px",
                                outline: "none",
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            marginTop: "10px",
                            padding: "12px",
                            background: "#0b63f6",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: submitting ? "not-allowed" : "pointer",
                            opacity: submitting ? 0.7 : 1,
                            transition: "background 0.2s"
                        }}
                        onMouseOver={(e) => e.target.style.background = "#0953cf"}
                        onMouseOut={(e) => e.target.style.background = "#0b63f6"}
                    >
                        {submitting ? "Updating Password..." : "Update Password"}
                    </button>
                </form>
            </div>
        </main>
    );
}

function SettingsManagement() {
    const [couponLimit, setCouponLimit] = useState(() => localStorage.getItem("setting_daily_limit") || "1000");
    const [totalUsersLimit, setTotalUsersLimit] = useState(() => localStorage.getItem("setting_total_users_limit") || "1000");
    const [upiGateway, setUpiGateway] = useState(() => localStorage.getItem("setting_upi_gateway") || "Enabled");
    const [message, setMessage] = useState({ text: "", isError: false });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        axios.get((window.API_BASE_URL || "") + "/api/admin-stats/settings")
            .then(res => {
                if (res.data.success && res.data.settings) {
                    const s = res.data.settings;
                    setCouponLimit(s.setting_daily_limit || "1000");
                    setTotalUsersLimit(s.setting_total_users_limit || "1000");
                    setUpiGateway(s.setting_upi_gateway || "Enabled");
                    
                    localStorage.setItem("setting_daily_limit", s.setting_daily_limit || "1000");
                    localStorage.setItem("setting_total_users_limit", s.setting_total_users_limit || "1000");
                    localStorage.setItem("setting_upi_gateway", s.setting_upi_gateway || "Enabled");
                }
            })
            .catch(err => console.error("Error loading settings from backend:", err));
    }, []);

    const handleSave = (e) => {
        e.preventDefault();
        setMessage({ text: "", isError: false });
        
        if (!couponLimit || isNaN(couponLimit) || Number(couponLimit) <= 0) {
            setMessage({ text: "Please enter a valid daily coupon limit.", isError: true });
            return;
        }

        if (!totalUsersLimit || isNaN(totalUsersLimit) || Number(totalUsersLimit) <= 0) {
            setMessage({ text: "Please enter a valid total users list limit.", isError: true });
            return;
        }

        setSaving(true);
        axios.post((window.API_BASE_URL || "") + "/api/admin-stats/settings", {
            setting_daily_limit: couponLimit,
            setting_total_users_limit: totalUsersLimit,
            setting_upi_gateway: upiGateway
        })
        .then(res => {
            if (res.data.success) {
                localStorage.setItem("setting_daily_limit", couponLimit);
                localStorage.setItem("setting_total_users_limit", totalUsersLimit);
                localStorage.setItem("setting_upi_gateway", upiGateway);
                setMessage({ text: "Settings saved successfully!", isError: false });
            } else {
                setMessage({ text: res.data.message || "Failed to save settings.", isError: true });
            }
            setSaving(false);
        })
        .catch(err => {
            console.error("Error saving settings to backend:", err);
            setMessage({ text: "Failed to save settings to server.", isError: true });
            setSaving(false);
        });
    };

    return (
        <main className="ec-settings-page" style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
            <div className="ec-panel" style={{ padding: "30px", borderRadius: "12px", background: "#fff", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "25px", borderBottom: "1px solid #f3f4f6", paddingBottom: "15px" }}>
                    <div style={{ background: "#dbeafe", color: "#2563eb", padding: "12px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <FaCog size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#111827" }}>Canteen System Settings</h2>
                        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "2px" }}>Configure coupon limits, total users list size, and payment gateway status</p>
                    </div>
                </div>

                {message.text && (
                    <div style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        marginBottom: "20px",
                        fontSize: "14px",
                        fontWeight: "500",
                        background: message.isError ? "#fee2e2" : "#d1fae5",
                        color: message.isError ? "#b91c1c" : "#065f46",
                        border: `1px solid ${message.isError ? "#fca5a5" : "#6ee7b7"}`
                    }}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Daily Coupon Limit</label>
                        <input
                            type="number"
                            required
                            placeholder="e.g. 1000"
                            value={couponLimit}
                            onChange={(e) => setCouponLimit(e.target.value)}
                            style={{
                                padding: "10px 14px",
                                borderRadius: "8px",
                                border: "1px solid #d1d5db",
                                fontSize: "14px",
                                outline: "none",
                                transition: "border-color 0.15s ease",
                                color: "#111827",
                                background: "#ffffff",
                            }}
                        />
                        <small style={{ color: "#6b7280", fontSize: "12px" }}>The maximum number of food coupons that can be issued site-wide per day.</small>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Total Users List Limit</label>
                        <input
                            type="number"
                            required
                            placeholder="e.g. 1000"
                            value={totalUsersLimit}
                            onChange={(e) => setTotalUsersLimit(e.target.value)}
                            style={{
                                padding: "10px 14px",
                                borderRadius: "8px",
                                border: "1px solid #d1d5db",
                                fontSize: "14px",
                                outline: "none",
                                color: "#111827",
                                background: "#ffffff",
                            }}
                        />
                        <small style={{ color: "#6b7280", fontSize: "12px" }}>The maximum limit for the daily users list size.</small>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>UPI Payment Gateway</label>
                        <select
                            value={upiGateway}
                            onChange={(e) => setUpiGateway(e.target.value)}
                            style={{
                                padding: "10px 14px",
                                borderRadius: "8px",
                                border: "1px solid #d1d5db",
                                fontSize: "14px",
                                outline: "none",
                                background: "#ffffff",
                                color: "#111827",
                                width: "100%",
                            }}
                        >
                            <option value="Enabled" style={{ color: "#111827", background: "#ffffff" }}>Enabled</option>
                            <option value="Disabled" style={{ color: "#111827", background: "#ffffff" }}>Disabled</option>
                        </select>
                        <small style={{ color: "#6b7280", fontSize: "12px" }}>Enable or disable online UPI payment options for users.</small>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            marginTop: "10px",
                            padding: "12px",
                            background: "#0b63f6",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: saving ? "not-allowed" : "pointer",
                            opacity: saving ? 0.7 : 1,
                            transition: "background 0.2s"
                        }}
                        onMouseOver={(e) => e.target.style.background = "#0953cf"}
                        onMouseOut={(e) => e.target.style.background = "#0b63f6"}
                    >
                        {saving ? "Saving Settings..." : "Save Settings"}
                    </button>
                </form>
            </div>
        </main>
    );
}

export default AdminDashboard;
