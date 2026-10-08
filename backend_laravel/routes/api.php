<?php

use App\Http\Controllers\AdminStatsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CashbookController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\WalletController;
use Illuminate\Support\Facades\Route;

// Health Check
Route::get('/health', function () {
    return response()->json([
        'success' => true,
        'message' => 'Canteen API Running (Laravel)'
    ]);
});

// Auth Routes
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/login-google', [AuthController::class, 'loginGoogle']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// Employee Routes
Route::prefix('employee')->group(function () {
    Route::get('/profile', [EmployeeController::class, 'getProfile']);
    Route::get('/list', [EmployeeController::class, 'getList']);
    Route::post('/add', [EmployeeController::class, 'add']);
    Route::put('/update', [EmployeeController::class, 'update']);
    Route::delete('/delete/{employeeId}', [EmployeeController::class, 'delete']);
});

// Menu Routes
Route::prefix('menu')->group(function () {
    Route::get('/', [MenuController::class, 'getAllItems']);
    Route::get('/sales-report', [MenuController::class, 'getSalesReport']);
    Route::post('/', [MenuController::class, 'addItem']);
    Route::put('/{id}', [MenuController::class, 'updateItem'])->whereNumber('id');
    Route::delete('/{id}', [MenuController::class, 'deleteItem'])->whereNumber('id');
    Route::post('/upload', [MenuController::class, 'uploadImage']);
    Route::get('/slots/all', [MenuController::class, 'getSlots']);
    Route::post('/slots/update', [MenuController::class, 'updateSlots']);
    Route::get('/{category}', [MenuController::class, 'getByCategory']);
});

// Order Routes
Route::prefix('orders')->group(function () {
    Route::post('/create', [OrderController::class, 'create']);
    Route::get('/', [OrderController::class, 'getAllOrders']);
    Route::get('/coupon/latest/{employeeId}', [OrderController::class, 'getLatestCoupon']);
    Route::get('/coupons/active/{employeeId}', [OrderController::class, 'getActiveCoupons']);
    Route::get('/cashier-stats/{employeeId}', [OrderController::class, 'getCashierStats']);
    Route::get('/details/{orderId}', [OrderController::class, 'getOrderDetails']);
    Route::get('/employee/{employeeId}', [OrderController::class, 'getEmployeeOrders']);
    Route::get('/active', [OrderController::class, 'getActiveOrders']);
    Route::get('/counter-stats', [OrderController::class, 'getCounterStats']);
    Route::post('/close-counter-lunch', [OrderController::class, 'closeCounterLunch']);
    Route::get('/verify-coupon/{couponCode}', [OrderController::class, 'verifyCoupon']);
    Route::post('/redeem-coupon', [OrderController::class, 'redeemCoupon']);
    Route::post('/redeem', [OrderController::class, 'redeemCoupon']);
});

// Payment Routes
Route::prefix('payments')->group(function () {
    Route::post('/create', [PaymentController::class, 'createPayment']);
    Route::get('/', [PaymentController::class, 'getAllPayments']);
    Route::get('/employee/{employeeId}', [PaymentController::class, 'getEmployeePayments']);
    Route::post('/easebuzz-initiate', [PaymentController::class, 'easebuzzInitiate']);
    Route::post('/easebuzz-verify', [PaymentController::class, 'easebuzzVerify']);
    Route::match(['get', 'post'], '/easebuzz-response', [PaymentController::class, 'easebuzzResponse']);
});

// Wallet Routes
Route::prefix('wallet')->group(function () {
    Route::get('/list', [WalletController::class, 'getList']);
    Route::get('/balance/{employeeId}', [WalletController::class, 'getBalance']);
    Route::post('/modify', [WalletController::class, 'modify']);
    Route::get('/audit-logs', [WalletController::class, 'getAuditLogs']);
    Route::get('/recharges', [WalletController::class, 'getRecharges']);
    Route::post('/verify-all', [WalletController::class, 'verifyAll']);
    Route::get('/transactions/{employeeId}', [WalletController::class, 'getTransactions']);
    Route::get('/stats', [WalletController::class, 'getStats']);
    Route::post('/recharge', [WalletController::class, 'recharge']);
    Route::get('/user-recharges', [WalletController::class, 'getUserRecharges']);
    Route::get('/pending/{employeeId}', [WalletController::class, 'getPending']);
    Route::post('/approve-user-recharge', [WalletController::class, 'approveUserRecharge']);
    Route::post('/cancel-user-recharge', [WalletController::class, 'cancelUserRecharge']);
});

// Cashbook Routes
Route::prefix('cashbook')->group(function () {
    Route::get('/summary', [CashbookController::class, 'getSummary']);
    Route::post('/manual-entry', [CashbookController::class, 'manualEntry']);
    Route::post('/daily-closing', [CashbookController::class, 'dailyClosing']);
    Route::get('/all-entries', [CashbookController::class, 'getAllEntries']);
    Route::get('/range-summary', [CashbookController::class, 'getRangeSummary']);
});

// Inventory Routes
Route::prefix('inventory')->group(function () {
    Route::get('/', [InventoryController::class, 'getAll']);
    Route::get('/purchases', [InventoryController::class, 'getPurchases']);
    Route::post('/purchase', [InventoryController::class, 'createPurchase']);
    Route::post('/issue', [InventoryController::class, 'issue']);
    Route::get('/issues', [InventoryController::class, 'getIssues']);
    Route::post('/add', [InventoryController::class, 'add']);
});

// Admin Stats & Settings Routes
Route::prefix('admin-stats')->group(function () {
    Route::get('/dashboard', [AdminStatsController::class, 'getDashboard']);
    Route::get('/reports', [AdminStatsController::class, 'getReports']);
    Route::get('/notifications', [AdminStatsController::class, 'getNotifications']);
    Route::get('/counters', [AdminStatsController::class, 'getCounters']);
    Route::get('/settings', [AdminStatsController::class, 'getSettings']);
    Route::post('/settings', [AdminStatsController::class, 'saveSettings']);
});

// Notifications Routes
Route::prefix('notifications')->group(function () {
    Route::post('/publish', [NotificationController::class, 'publish']);
    Route::get('/list', [NotificationController::class, 'list']);
    Route::delete('/{id}', [NotificationController::class, 'delete'])->whereNumber('id');
    Route::put('/{id}/toggle-bulletin', [NotificationController::class, 'toggleBulletin'])->whereNumber('id');
});

// Feedback Routes
Route::prefix('feedback')->group(function () {
    Route::post('/', [FeedbackController::class, 'submitFeedback']);
    Route::get('/all', [FeedbackController::class, 'getAllFeedback']);
    Route::delete('/{id}', [FeedbackController::class, 'deleteFeedback'])->whereNumber('id');
});
