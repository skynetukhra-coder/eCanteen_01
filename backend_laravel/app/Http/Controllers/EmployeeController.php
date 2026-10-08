<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\Wallet;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmployeeController extends Controller
{
    protected WalletService $walletService;

    public function __construct(WalletService $walletService)
    {
        $this->walletService = $walletService;
    }

    public function getProfile(Request $request)
    {
        try {
            $username = $request->query('username') ?: $request->input('username');

            if (!$username) {
                // If Authorization header Bearer token exists, we could decode it or check request
                $authHeader = $request->header('Authorization');
                if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
                    $token = substr($authHeader, 7);
                    // Decode JWT token payload without throwing
                    $parts = explode('.', $token);
                    if (count($parts) === 3) {
                        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);
                        $username = $payload['username'] ?? null;
                    }
                }
            }

            if (!$username) {
                return response()->json([
                    'message' => 'Username required or access denied.'
                ], 401);
            }

            $user = Employee::select([
                'employee_id',
                'username',
                'full_name',
                'role',
                'email',
                'google_email',
                'mobile',
                'designation',
                'profile_image'
            ])->where('username', $username)->first();

            if (!$user) {
                return response()->json([
                    'message' => 'Employee profile not found'
                ], 404);
            }

            return response()->json($user);
        } catch (\Exception $e) {
            Log::error('GET PROFILE ERROR: ' . $e->getMessage());
            return response()->json([
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getList()
    {
        try {
            $employees = Employee::select([
                'employee_id',
                'username',
                'full_name',
                'role',
                'email',
                'google_email',
                'mobile',
                'designation',
                'profile_image',
                'created_at'
            ])->orderBy('employee_id', 'desc')->get();

            return response()->json($employees);
        } catch (\Exception $e) {
            Log::error('GET EMPLOYEES ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function add(Request $request)
    {
        try {
            $username = strtoupper(trim((string)$request->input('username')));
            $fullName = trim((string)$request->input('full_name'));
            $password = $request->input('password') ?: '12345';
            $role = $request->input('role') ?: 'EMPLOYEE';
            $email = $request->input('email') ? trim((string)$request->input('email')) : null;
            $googleEmail = $request->input('google_email') ? trim((string)$request->input('google_email')) : null;
            $mobile = $request->input('mobile') ? trim((string)$request->input('mobile')) : null;
            $designation = $request->input('designation') ? trim((string)$request->input('designation')) : null;

            if (empty($username) || empty($fullName)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Username (Employee Code) and Full Name are required.'
                ], 400);
            }

            $exists = Employee::where('username', $username)->exists();
            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => "Username '{$username}' already exists."
                ], 400);
            }

            $employee = Employee::create([
                'username' => $username,
                'password' => $password,
                'full_name' => $fullName,
                'role' => $role,
                'email' => $email,
                'google_email' => $googleEmail,
                'mobile' => $mobile,
                'designation' => $designation,
            ]);

            $newEmpId = $employee->employee_id;

            // Initialize wallet with HMAC signature
            $initialBalance = 0.00;
            $walletSig = $this->walletService->generateSignature($newEmpId, $initialBalance);
            Wallet::create([
                'employee_id' => $newEmpId,
                'balance' => $initialBalance,
                'signature' => $walletSig,
            ]);

            AuditLog::create([
                'action_name' => 'EMPLOYEE_CREATED',
                'details' => "Created new user: {$fullName} ({$username}) with Role: {$role}.",
                'severity' => 'INFO'
            ]);

            return response()->json([
                'success' => true,
                'message' => "User '{$fullName}' added successfully!",
                'employee_id' => $newEmpId
            ]);
        } catch (\Exception $e) {
            Log::error('ADD EMPLOYEE ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request)
    {
        try {
            $employeeId = $request->input('employee_id');
            if (!$employeeId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee ID is required.'
                ], 400);
            }

            $employee = Employee::find($employeeId);
            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found.'
                ], 404);
            }

            $cleanUsername = $request->input('username') ? strtoupper(trim((string)$request->input('username'))) : null;
            if ($cleanUsername && $cleanUsername !== $employee->username) {
                $duplicate = Employee::where('username', $cleanUsername)
                    ->where('employee_id', '!=', $employeeId)
                    ->exists();

                if ($duplicate) {
                    return response()->json([
                        'success' => false,
                        'message' => "Username '{$cleanUsername}' is already used by another employee."
                    ], 400);
                }
                $employee->username = $cleanUsername;
            }

            if ($request->has('full_name')) {
                $employee->full_name = trim((string)$request->input('full_name'));
            }
            if ($request->filled('password')) {
                $employee->password = trim((string)$request->input('password'));
            }
            if ($request->has('role')) {
                $employee->role = $request->input('role');
            }
            if ($request->has('email')) {
                $employee->email = $request->input('email') ? trim((string)$request->input('email')) : null;
            }
            if ($request->has('google_email')) {
                $employee->google_email = $request->input('google_email') ? trim((string)$request->input('google_email')) : null;
            }
            if ($request->has('mobile')) {
                $employee->mobile = $request->input('mobile') ? trim((string)$request->input('mobile')) : null;
            }
            if ($request->has('designation')) {
                $employee->designation = $request->input('designation') ? trim((string)$request->input('designation')) : null;
            }

            $employee->save();

            AuditLog::create([
                'action_name' => 'EMPLOYEE_UPDATED',
                'details' => "Updated details for Employee ID {$employeeId} ({$employee->full_name}).",
                'severity' => 'INFO'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'User details updated successfully.'
            ]);
        } catch (\Exception $e) {
            Log::error('UPDATE EMPLOYEE ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function delete($employeeId)
    {
        try {
            $employee = Employee::find($employeeId);
            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found.'
                ], 404);
            }

            if (in_array($employee->username, ['WBKLE2242172', 'admin', 'admin_user'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'System Admin accounts cannot be deleted.'
                ], 400);
            }

            Wallet::where('employee_id', $employeeId)->delete();
            $fullName = $employee->full_name;
            $username = $employee->username;
            $employee->delete();

            AuditLog::create([
                'action_name' => 'EMPLOYEE_DELETED',
                'details' => "Deleted user: {$fullName} ({$username}) [ID: {$employeeId}].",
                'severity' => 'WARNING'
            ]);

            return response()->json([
                'success' => true,
                'message' => "User '{$fullName}' deleted successfully."
            ]);
        } catch (\Exception $e) {
            Log::error('DELETE EMPLOYEE ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
