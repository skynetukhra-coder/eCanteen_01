import { Routes, Route } from "react-router-dom";

// Auth
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";

// User Pages
import Home from "./pages/user/Home";
import Menu from "./pages/user/Menu";
import Payment from "./pages/user/Payment";
import PaymentSuccess from "./pages/user/PaymentSuccess";
import Profile from "./pages/user/Profile";
import Orders from "./pages/user/Orders";
import Coupon from "./pages/user/Coupon";
import Wallet from "./pages/user/Wallet";
import MenuDetails from "./pages/employee/MenuDetails";
import AdminPayment from "./pages/user/AdminPayment";
import AdminCoupon from "./pages/user/AdminCoupon";
import {
  PersonalInformation,
  ChangePassword,
  PaymentMethods,
  NotificationSettings
} from "./pages/user/SettingsPages";

// Kitchen / Staff Pages
import Kitchen from "./pages/kitchen/Kitchen";

// Admin Pages
import MenuManagement from "./pages/admin/MenuManagement";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Store from "./pages/admin/Store";
import Cashbook from "./pages/admin/Cashbook";
import OrdersManagement from "./pages/admin/OrdersManagement";

function App() {
  return (
    <Routes>

      {/* Authentication */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* User Routes */}
      <Route path="/home" element={<Home />} />

      <Route path="/payment" element={<Payment />} />
      <Route path="/admin-payment" element={<AdminPayment />} />
      <Route path="/admin-coupon" element={<AdminCoupon />} />
      <Route
        path="/paymentsuccess"
        element={<PaymentSuccess />}
      />
      <Route path="/orders" element={<Orders />} />
      <Route path="/coupons" element={<Coupon />} />
      <Route path="/wallet" element={<Wallet />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/personal-information" element={<PersonalInformation />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/payment-methods" element={<PaymentMethods />} />
      <Route path="/notification-settings" element={<NotificationSettings />} />

      {/* Kitchen Staff Route */}
      <Route path="/kitchen" element={<Kitchen />} />

      <Route
        path="/menu/:mealType"
        element={<MenuDetails />}
      />

      {/* Admin Routes */}


      <Route
        path="/admin"
        element={<AdminDashboard />}
      />

      <Route
        path="/admin/menu"
        element={<AdminDashboard />}
      />

      <Route path="/admin/orders" element={<AdminDashboard />} />

      <Route
        path="/admin/payments"
        element={<AdminDashboard />}
      />

      <Route
        path="/admin/users"
        element={<AdminDashboard />}
      />

      <Route
        path="/admin/counters"
        element={<AdminDashboard />}
      />

      <Route
        path="/admin/store-inventory"
        element={<AdminDashboard />}
      />

      <Route
        path="/admin/cashbook"
        element={<AdminDashboard />}
      />

      <Route
        path="/admin/reports"
        element={<AdminDashboard />}
      />

      <Route
        path="/admin/notifications"
        element={<AdminDashboard />}
      />

      <Route
        path="/admin/settings"
        element={<AdminDashboard />}
      />

      <Route
        path="/admin/audit-logs"
        element={<AdminDashboard />}
      />

      <Route
        path="/admin/wallet"
        element={<AdminDashboard />}
      />

      <Route
        path="/admin/change-password"
        element={<AdminDashboard />}
      />

      {/* Fallback */}
      <Route
        path="*"
        element={<Login />}
      />

    </Routes>
  );
}

export default App;