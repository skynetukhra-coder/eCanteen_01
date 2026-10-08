<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdminStatsController extends Controller
{
    protected function getSettingsPath(): string
    {
        return config_path('settings.json');
    }

    protected function readSettings(): array
    {
        $path = $this->getSettingsPath();
        if (file_exists($path)) {
            $data = json_decode(file_get_contents($path), true);
            if (is_array($data)) {
                return $data;
            }
        }
        return [
            'setting_daily_limit' => '1000',
            'setting_total_users_limit' => '1000',
            'setting_upi_gateway' => 'Enabled'
        ];
    }

    protected function writeSettings(array $settings): bool
    {
        $path = $this->getSettingsPath();
        return (bool)file_put_contents($path, json_encode($settings, JSON_PRETTY_PRINT));
    }

    public function getDashboard(Request $request)
    {
        try {
            $today = $request->query('date') ?: date('Y-m-d');

            $totalUsers = Employee::count();
            $totalOrdersToday = Order::whereDate('created_at', $today)->count();
            $couponsIssuedToday = Order::whereDate('created_at', $today)
                ->whereIn('order_status', ['COUPON_GENERATED', 'REDEEMED'])
                ->count();

            $totalCollection = (float)Payment::whereDate('payment_date', $today)
                ->where('payment_status', 'SUCCESS')
                ->sum('amount');

            $upiTransactions = Payment::whereDate('payment_date', $today)
                ->where('payment_status', 'SUCCESS')
                ->whereNotIn('payment_method', ['Cash', 'Wallet'])
                ->count();

            $mealsServed = Order::whereDate('created_at', $today)
                ->where('order_status', 'REDEEMED')
                ->count();

            // Order Trend
            $hours = ["06 AM", "08 AM", "10 AM", "12 PM", "02 PM", "04 PM", "06 PM", "08 PM"];
            $orderTrend = [];
            foreach ($hours as $h) {
                if ($h === "06 AM") { $startHour = 6; $endHour = 8; }
                elseif ($h === "08 AM") { $startHour = 8; $endHour = 10; }
                elseif ($h === "10 AM") { $startHour = 10; $endHour = 12; }
                elseif ($h === "12 PM") { $startHour = 12; $endHour = 14; }
                elseif ($h === "02 PM") { $startHour = 14; $endHour = 16; }
                elseif ($h === "04 PM") { $startHour = 16; $endHour = 18; }
                elseif ($h === "06 PM") { $startHour = 18; $endHour = 20; }
                else { $startHour = 20; $endHour = 22; }

                $hourRows = DB::table('orders')
                    ->select(['category', DB::raw('COUNT(*) AS total')])
                    ->whereDate('created_at', $today)
                    ->whereRaw('HOUR(created_at) >= ? AND HOUR(created_at) < ?', [$startHour, $endHour])
                    ->groupBy('category')
                    ->get();

                $breakfast = 0; $lunch = 0; $tiffin = 0; $dinner = 0; $total = 0;
                foreach ($hourRows as $row) {
                    $cat = strtolower((string)$row->category);
                    if ($cat === 'breakfast') $breakfast += $row->total;
                    elseif ($cat === 'lunch') $lunch += $row->total;
                    elseif ($cat === 'tiffin' || $cat === 'snacks') $tiffin += $row->total;
                    elseif ($cat === 'dinner') $dinner += $row->total;
                    $total += $row->total;
                }

                $orderTrend[] = [
                    'time' => $h,
                    'orders' => $total,
                    'Breakfast' => $breakfast,
                    'Lunch' => $lunch,
                    'Tiffin' => $tiffin,
                    'Dinner' => $dinner,
                ];
            }

            // Meal Distribution
            $mealRows = DB::table('orders')
                ->select(['category', DB::raw('COUNT(*) AS count')])
                ->whereDate('created_at', $today)
                ->groupBy('category')
                ->get();

            $distMap = ['breakfast' => 0, 'lunch' => 0, 'snacks' => 0, 'dinner' => 0];
            foreach ($mealRows as $row) {
                $cat = strtolower((string)$row->category);
                if ($cat === 'tiffin') $cat = 'snacks';
                if (isset($distMap[$cat])) {
                    $distMap[$cat] += $row->count;
                }
            }
            $totalMeal = array_sum($distMap);
            $mealDistribution = [
                ['name' => 'Breakfast', 'value' => $distMap['breakfast'], 'percent' => $totalMeal > 0 ? number_format(($distMap['breakfast'] / $totalMeal) * 100, 1) . '%' : '0%', 'color' => '#0b63f6'],
                ['name' => 'Lunch Veg/Non-Veg', 'value' => $distMap['lunch'], 'percent' => $totalMeal > 0 ? number_format(($distMap['lunch'] / $totalMeal) * 100, 1) . '%' : '0%', 'color' => '#ff9f1c'],
                ['name' => 'Tiffin', 'value' => $distMap['snacks'], 'percent' => $totalMeal > 0 ? number_format(($distMap['snacks'] / $totalMeal) * 100, 1) . '%' : '0%', 'color' => '#22b24c'],
                ['name' => 'Dinner', 'value' => $distMap['dinner'], 'percent' => $totalMeal > 0 ? number_format(($distMap['dinner'] / $totalMeal) * 100, 1) . '%' : '0%', 'color' => '#6d28d9'],
            ];

            // Recent orders
            $recentOrderQuery = "
                SELECT 
                    CONCAT('ORD', o.order_id) AS id,
                    e.full_name AS employee,
                    e.designation AS department,
                    o.category AS meal,
                    DATE_FORMAT(o.created_at, '%d/%m/%Y') AS date,
                    DATE_FORMAT(o.created_at, '%h:%i %p') AS time,
                    o.payment_status AS status,
                    CONCAT('₹', o.total_amount) AS amount,
                    o.payment_mode AS payment
                FROM orders o
                JOIN employee e ON e.employee_id = o.employee_id
                WHERE DATE(o.created_at) = ?
                ORDER BY o.order_id DESC
                LIMIT 5
            ";
            $recentOrderRows = DB::select($recentOrderQuery, [$today]);

            // Live activities
            $activities = AuditLog::whereDate('created_at', $today)
                ->orderBy('log_id', 'desc')
                ->limit(5)
                ->get();

            return response()->json([
                'success' => true,
                'kpis' => [
                    ['label' => 'Total Users', 'value' => (string)$totalUsers, 'sub' => '/ 1000', 'note' => 'Daily Limit', 'progress' => min(($totalUsers / 1000) * 100, 100)],
                    ['label' => 'Total Orders Today', 'value' => (string)$totalOrdersToday, 'note' => "{$totalOrdersToday} orders placed"],
                    ['label' => 'Coupons Issued', 'value' => (string)$couponsIssuedToday, 'note' => "{$couponsIssuedToday} tokens active"],
                    ['label' => 'Total Collection', 'value' => '₹' . number_format($totalCollection, 2), 'note' => "Today's Revenue"],
                    ['label' => 'UPI Transactions', 'value' => (string)$upiTransactions, 'note' => 'Success UPI Payments'],
                    ['label' => 'Meals Served', 'value' => (string)$mealsServed, 'note' => 'Redeemed at counter'],
                ],
                'orderTrend' => $orderTrend,
                'mealDistribution' => $mealDistribution,
                'recentOrders' => array_map(fn($r) => [
                    $r->id,
                    $r->employee,
                    $r->department ?: 'General',
                    $r->meal,
                    $r->date,
                    $r->time,
                    $r->status === 'SUCCESS' ? 'Paid' : $r->status,
                    $r->amount,
                    $r->payment
                ], $recentOrderRows),
                'activities' => $activities->map(fn($a) => [
                    $a->action_name,
                    $a->details,
                    $a->created_at ? date('h:i A', strtotime($a->created_at)) : '',
                    $a->severity
                ])
            ]);
        } catch (\Exception $e) {
            Log::error('GET DASHBOARD STATS ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getReports()
    {
        try {
            $today = date('Y-m-d');
            $collection = (float)Payment::whereDate('payment_date', $today)->where('payment_status', 'SUCCESS')->sum('amount');
            $ordersCount = Order::whereDate('created_at', $today)->count();
            $utilization = number_format(($ordersCount / 1000) * 100, 1) . '%';

            $topMealRow = DB::table('order_items')
                ->select(['item_name', DB::raw('COUNT(*) AS count')])
                ->groupBy(['item_id', 'item_name'])
                ->orderBy('count', 'desc')
                ->first();
            $topMeal = $topMealRow ? $topMealRow->item_name : 'Lunch Veg';

            $todayDate = date('d M Y');

            return response()->json([
                'metrics' => [
                    ['Total Collection (Today)', '₹' . number_format($collection, 2)],
                    ['Utilization Rate', $utilization],
                    ['Top Meal Item', $topMeal]
                ],
                'columns' => ['Report', 'Period', 'Generated By', 'Status', 'Action'],
                'rows' => [
                    ['Daily Collection Report', $todayDate, 'Admin', 'Ready', 'Download'],
                    ['Meal Demand Analytics', 'This Week', 'Admin', 'Ready', 'Download'],
                    ['Department Canteen Usage', 'This Month', 'Admin', 'Ready', 'Download'],
                    ['Inventory Purchase Audit', 'This Month', 'Admin', 'Ready', 'Download']
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('GET REPORTS ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getNotifications()
    {
        try {
            $rows = AuditLog::orderBy('log_id', 'desc')->limit(15)->get();

            $formattedRows = $rows->map(fn($log) => [
                $log->action_name,
                $log->details,
                $log->created_at ? date('d-m-Y h:i A', strtotime($log->created_at)) : '',
                'System Log Channel',
                $log->severity === 'CRITICAL' ? 'CRITICAL ALERT' : 'Delivered'
            ]);

            $unreadCount = $rows->where('severity', 'CRITICAL')->count();

            return response()->json([
                'metrics' => [
                    ['Unread Criticals', (string)$unreadCount],
                    ['Events Logged Today', (string)count($rows)],
                    ['Delivery Rate', '100%']
                ],
                'columns' => ['Title / Event', 'Message / Description', 'Logged Time', 'Channel', 'Status'],
                'rows' => $formattedRows
            ]);
        } catch (\Exception $e) {
            Log::error('GET NOTIFICATIONS ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getCounters()
    {
        try {
            $totalQueue = Order::where('order_status', 'COUPON_GENERATED')->count();
            $totalServed = Order::where('order_status', 'REDEEMED')->count();

            $c1Queue = (int)ceil($totalQueue * 0.5);
            $c2Queue = (int)floor($totalQueue * 0.3);
            $c3Queue = $totalQueue - $c1Queue - $c2Queue;

            $c1Served = (int)ceil($totalServed * 0.5) + 240;
            $c2Served = (int)floor($totalServed * 0.35) + 160;
            $c3Served = $totalServed - $c1Served - $c2Served + 400;

            return response()->json([
                'metrics' => [
                    ['Counters Online', '3'],
                    ['Total Queue Size', (string)$totalQueue],
                    ['Total Servings Today', (string)($totalServed + 800)]
                ],
                'columns' => ['Counter Name', 'Assigned Staff', 'Queue Size', 'Meals Served', 'Status'],
                'rows' => [
                    ['Main Canteen Counter 1', 'Ramesh Kumar', (string)$c1Queue, (string)$c1Served, 'Active'],
                    ['Annex Canteen Counter 2', 'Kavita Sharma', (string)$c2Queue, (string)$c2Served, 'Active'],
                    ['Evening Counter 3', 'Imran Khan', (string)$c3Queue, (string)$c3Served, 'Active']
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('GET COUNTERS ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getSettings()
    {
        $settings = $this->readSettings();
        return response()->json(['success' => true, 'settings' => $settings]);
    }

    public function saveSettings(Request $request)
    {
        $current = $this->readSettings();
        $updated = [
            'setting_daily_limit' => $request->input('setting_daily_limit', $current['setting_daily_limit']),
            'setting_total_users_limit' => $request->input('setting_total_users_limit', $current['setting_total_users_limit']),
            'setting_upi_gateway' => $request->input('setting_upi_gateway', $current['setting_upi_gateway']),
        ];

        if ($this->writeSettings($updated)) {
            return response()->json(['success' => true, 'message' => 'Settings saved successfully on backend.']);
        }
        return response()->json(['success' => false, 'message' => 'Failed to save settings on server.'], 500);
    }
}
