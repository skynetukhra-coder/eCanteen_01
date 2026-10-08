<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderController extends Controller
{
    /**
     * Helper to resolve actual employee ID (redirects ADMIN checkouts to guest 'admin_user')
     */
    protected function resolveEmployeeId(int|string $employeeId): int|string
    {
        $emp = Employee::find($employeeId);
        if ($emp && $emp->role === 'ADMIN') {
            $adminGuest = Employee::where('username', 'admin_user')->first();
            if ($adminGuest) {
                return $adminGuest->employee_id;
            }
        }
        return $employeeId;
    }

    public function create(Request $request)
    {
        try {
            $employeeId = $request->input('employee_id');
            $category = $request->input('category');
            $items = $request->input('items', []);
            $totalAmount = $request->input('total_amount');
            $paymentMode = $request->input('payment_mode');
            $checkoutToken = $request->input('checkout_token');

            $empId = $this->resolveEmployeeId($employeeId);
            $emp = Employee::find($employeeId);

            // Backend Idempotency Check using checkout_token
            if ($checkoutToken) {
                $existingOrder = Order::where('checkout_token', $checkoutToken)->first();
                if ($existingOrder) {
                    Log::info("[Idempotency] Duplicate checkout detected for token: {$checkoutToken}. Returning existing order ID: {$existingOrder->order_id}");
                    return response()->json([
                        'success' => true,
                        'order_id' => $existingOrder->order_id,
                        'coupon_code' => $existingOrder->coupon_code,
                        'duplicated' => true
                    ]);
                }
            }

            // Check stock availability for non-admin employee orders
            if (!$emp || $emp->role !== 'ADMIN') {
                foreach ($items as $item) {
                    $itemId = $item['item_id'] ?? $item['id'];
                    $menuItem = MenuItem::find($itemId);
                    if (!$menuItem) {
                        return response()->json([
                            'success' => false,
                            'message' => "Menu item not found: " . ($item['item_name'] ?? $item['name'] ?? '')
                        ], 404);
                    }
                    $available = (int)$menuItem->available_qty;
                    $reqQty = (int)($item['quantity'] ?? 1);
                    if ($available < $reqQty) {
                        return response()->json([
                            'success' => false,
                            'message' => "Insufficient stock for {$menuItem->item_name}. Available: {$available}, requested: {$reqQty}"
                        ], 400);
                    }
                }
            }

            $couponCode = 'CPN' . round(microtime(true) * 1000);
            $qrCodePath = "/qr/{$couponCode}.png";
            $isTiffin = strtolower((string)$category) === 'tiffin';

            DB::beginTransaction();

            $order = Order::create([
                'employee_id' => $empId,
                'category' => $category,
                'total_amount' => $totalAmount,
                'payment_mode' => $paymentMode,
                'payment_status' => 'SUCCESS',
                'order_status' => $isTiffin ? 'REDEEMED' : 'COUPON_GENERATED',
                'coupon_code' => $couponCode,
                'qr_code_path' => $qrCodePath,
                'checkout_token' => $checkoutToken ?: null,
            ]);

            $orderId = $order->order_id;

            foreach ($items as $item) {
                $itemId = $item['item_id'] ?? $item['id'];
                $itemName = $item['item_name'] ?? $item['name'];
                $quantity = (int)($item['quantity'] ?? 1);
                $price = (float)($item['price'] ?? 0);

                OrderItem::create([
                    'order_id' => $orderId,
                    'item_id' => $itemId,
                    'item_name' => $itemName,
                    'quantity' => $quantity,
                    'unit_price' => $price,
                    'total_price' => $price * $quantity,
                ]);

                // Real-time stock decrement
                DB::table('menu_items')
                    ->where('item_id', $itemId)
                    ->update([
                        'available_qty' => DB::raw("GREATEST(0, available_qty - {$quantity})"),
                        'issued' => DB::raw("issued + {$quantity}")
                    ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'order_id' => $orderId,
                'coupon_code' => $couponCode,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('ORDER CREATION ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Order creation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getAllOrders()
    {
        try {
            $query = "
                SELECT
                    CONCAT('ORD', o.order_id) AS id,
                    e.full_name AS employee,
                    o.category,
                    GROUP_CONCAT(CONCAT(oi.item_name, '*', oi.quantity) SEPARATOR ', ') AS items,
                    DATE_FORMAT(o.created_at, '%h:%i %p') AS createdAt,
                    o.created_at AS rawDate,
                    o.order_status AS status,
                    CONCAT('₹', o.total_amount) AS amount,
                    o.payment_mode AS payment,
                    o.coupon_code AS couponId,
                    o.qr_code_path AS qrCode
                FROM orders o
                JOIN employee e ON e.employee_id = o.employee_id
                JOIN order_items oi ON oi.order_id = o.order_id
                GROUP BY o.order_id
                ORDER BY o.order_id DESC
            ";

            $rows = DB::select($query);
            return response()->json($rows);
        } catch (\Exception $e) {
            Log::error('GET ALL ORDERS ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getLatestCoupon($employeeId)
    {
        try {
            $empId = $this->resolveEmployeeId($employeeId);

            $row = DB::table('orders as o')
                ->join('employee as e', 'e.employee_id', '=', 'o.employee_id')
                ->select([
                    'o.order_id',
                    'o.coupon_code',
                    'o.qr_code_path',
                    'o.category',
                    'o.total_amount',
                    'o.created_at',
                    'e.employee_id',
                    'e.full_name'
                ])
                ->where('o.employee_id', $empId)
                ->orderBy('o.order_id', 'desc')
                ->first();

            return response()->json($row ?: (object)[]);
        } catch (\Exception $e) {
            Log::error('GET LATEST COUPON ERROR: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getActiveCoupons($employeeId)
    {
        try {
            $empId = $this->resolveEmployeeId($employeeId);

            $query = "
                SELECT
                    o.order_id,
                    o.coupon_code,
                    o.qr_code_path,
                    o.category,
                    o.total_amount,
                    o.order_status,
                    o.created_at,
                    o.updated_at,
                    e.employee_id,
                    e.full_name,
                    GROUP_CONCAT(CONCAT(oi.item_name, '*', oi.quantity) SEPARATOR ', ') AS items
                FROM orders o
                JOIN employee e ON e.employee_id = o.employee_id
                LEFT JOIN order_items oi ON oi.order_id = o.order_id
                WHERE o.employee_id = ? AND (
                    o.order_status IN ('COUPON_GENERATED', 'PENDING_APPROVAL')
                    OR (o.order_status = 'CANCELLED' AND (o.updated_at >= NOW() - INTERVAL 2 DAY OR o.created_at >= NOW() - INTERVAL 2 DAY))
                )
                GROUP BY o.order_id
                ORDER BY o.order_id DESC
            ";

            $rows = DB::select($query, [$empId]);
            return response()->json($rows);
        } catch (\Exception $e) {
            Log::error('GET ACTIVE COUPONS ERROR: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getCashierStats($employeeId)
    {
        try {
            $today = date('Y-m-d');

            $cashTotal = DB::table('payments')
                ->where('employee_id', $employeeId)
                ->where('payment_method', 'Cash')
                ->whereDate('payment_date', $today)
                ->where('payment_status', 'SUCCESS')
                ->sum('amount');

            $qrTotal = DB::table('payments')
                ->where('employee_id', $employeeId)
                ->where('payment_method', 'Scan QR')
                ->whereDate('payment_date', $today)
                ->where('payment_status', 'SUCCESS')
                ->sum('amount');

            return response()->json([
                'success' => true,
                'cashCollection' => (float)$cashTotal,
                'qrCollection' => (float)$qrTotal
            ]);
        } catch (\Exception $e) {
            Log::error('GET CASHIER STATS ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getOrderDetails($orderId)
    {
        try {
            $items = OrderItem::where('order_id', $orderId)->get();
            return response()->json([
                'success' => true,
                'items' => $items
            ]);
        } catch (\Exception $e) {
            Log::error('GET ORDER DETAILS ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getEmployeeOrders($employeeId)
    {
        try {
            $empId = $this->resolveEmployeeId($employeeId);

            $query = "
                SELECT
                    o.order_id,
                    o.category,
                    o.total_amount,
                    o.order_status,
                    o.coupon_code,
                    o.pickup_time,
                    o.created_at,
                    GROUP_CONCAT(CONCAT(oi.item_name, '*', oi.quantity) SEPARATOR ', ') AS items
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.order_id
                WHERE o.employee_id = ?
                GROUP BY o.order_id
                ORDER BY o.order_id DESC
            ";

            $rows = DB::select($query, [$empId]);
            return response()->json($rows);
        } catch (\Exception $e) {
            Log::error('GET EMPLOYEE ORDERS ERROR: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getActiveOrders()
    {
        try {
            $query = "
                SELECT
                    o.order_id,
                    o.category,
                    o.total_amount,
                    o.order_status,
                    o.coupon_code,
                    o.qr_code_path,
                    DATE_FORMAT(o.created_at, '%d-%m-%Y %h:%i %p') AS created_at,
                    e.full_name AS employee_name,
                    GROUP_CONCAT(CONCAT(oi.item_name, '*', oi.quantity) SEPARATOR ', ') AS items
                FROM orders o
                JOIN employee e ON o.employee_id = e.employee_id
                JOIN order_items oi ON o.order_id = oi.order_id
                WHERE o.order_status = 'COUPON_GENERATED'
                GROUP BY o.order_id
                ORDER BY o.order_id ASC
            ";

            $rows = DB::select($query);
            return response()->json($rows);
        } catch (\Exception $e) {
            Log::error('GET ACTIVE ORDERS ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getCounterStats()
    {
        try {
            $today = date('Y-m-d');

            $total = DB::table('orders')->whereDate('created_at', $today)->count();
            $redeemed = DB::table('orders')->where('order_status', 'REDEEMED')->whereDate('created_at', $today)->count();
            $pending = DB::table('orders')->where('order_status', 'COUPON_GENERATED')->whereDate('created_at', $today)->count();

            return response()->json([
                'success' => true,
                'total' => $total,
                'redeemed' => $redeemed,
                'pending' => $pending
            ]);
        } catch (\Exception $e) {
            Log::error('GET COUNTER STATS ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function closeCounterLunch()
    {
        try {
            $today = date('Y-m-d');
            $affected = DB::table('orders')
                ->where('order_status', 'COUPON_GENERATED')
                ->where('category', 'Lunch')
                ->whereDate('created_at', $today)
                ->update(['order_status' => 'REDEEMED']);

            return response()->json([
                'success' => true,
                'message' => "Closed counter. {$affected} pending lunch coupons redeemed successfully."
            ]);
        } catch (\Exception $e) {
            Log::error('CLOSE COUNTER LUNCH ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function verifyCoupon($couponCode)
    {
        try {
            $order = DB::table('orders as o')
                ->join('employee as e', 'e.employee_id', '=', 'o.employee_id')
                ->select([
                    'o.order_id',
                    'o.coupon_code',
                    'o.order_status',
                    'e.full_name as employee_name'
                ])
                ->where('o.coupon_code', $couponCode)
                ->first();

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid Coupon QR Code'
                ], 404);
            }

            $items = DB::table('order_items')
                ->select(['item_name', 'quantity'])
                ->where('order_id', $order->order_id)
                ->get();

            return response()->json([
                'success' => true,
                'order' => [
                    'order_id' => $order->order_id,
                    'coupon_code' => $order->coupon_code,
                    'order_status' => $order->order_status,
                    'employee_name' => $order->employee_name,
                    'items' => $items
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('VERIFY COUPON ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function redeemCoupon(Request $request)
    {
        try {
            $code = $request->input('couponCode') ?: $request->input('coupon_code');
            if (empty($code)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Coupon code is required'
                ], 400);
            }

            $order = Order::where('coupon_code', $code)->first();
            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Coupon code not found'
                ], 404);
            }

            if ($order->order_status === 'REDEEMED') {
                return response()->json([
                    'success' => false,
                    'message' => 'This coupon has already been redeemed'
                ], 400);
            } elseif ($order->order_status === 'CANCELLED') {
                return response()->json([
                    'success' => false,
                    'message' => 'This coupon has been cancelled'
                ], 400);
            }

            $order->order_status = 'REDEEMED';
            $order->save();

            return response()->json([
                'success' => true,
                'message' => "Coupon code '{$code}' redeemed successfully! Serve the meal."
            ]);
        } catch (\Exception $e) {
            Log::error('REDEEM COUPON ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
