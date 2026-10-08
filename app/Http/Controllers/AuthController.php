<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        try {
            $username = trim((string)$request->input('username'));
            $password = (string)$request->input('password');

            $user = Employee::where('username', $username)->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ]);
            }

            if ($password !== $user->password) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid Password'
                ]);
            }

            return response()->json([
                'success' => true,
                'user' => [
                    'employee_id' => $user->employee_id,
                    'username' => $user->username,
                    'full_name' => $user->full_name,
                    'role' => $user->role,
                    'email' => $user->email,
                    'google_email' => $user->google_email,
                    'mobile' => $user->mobile,
                    'designation' => $user->designation,
                    'profile_image' => $user->profile_image,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('LOGIN ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function changePassword(Request $request)
    {
        try {
            $employeeId = $request->input('employee_id');
            $currentPassword = (string)$request->input('current_password');
            $newPassword = (string)$request->input('new_password');

            if (!$employeeId || empty($currentPassword) || empty($newPassword)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Missing required fields (employee_id, current_password, new_password).'
                ], 400);
            }

            $user = Employee::find($employeeId);
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee user not found.'
                ], 404);
            }

            if ($currentPassword !== $user->password) {
                return response()->json([
                    'success' => false,
                    'message' => 'Incorrect current password.'
                ], 400);
            }

            $user->password = $newPassword;
            $user->save();

            AuditLog::create([
                'action_name' => 'PASSWORD_CHANGED',
                'details' => "User {$user->full_name} (ID: {$employeeId}, Role: {$user->role}) successfully changed their password.",
                'severity' => 'INFO'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Password changed successfully.'
            ]);
        } catch (\Exception $e) {
            Log::error('CHANGE PASSWORD ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function loginGoogle(Request $request)
    {
        try {
            $idToken = $request->input('idToken');
            if (!$idToken) {
                return response()->json([
                    'success' => false,
                    'message' => 'ID Token is required'
                ], 400);
            }

            $response = Http::get("https://oauth2.googleapis.com/tokeninfo?id_token={$idToken}");
            if (!$response->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid Google Token'
                ], 400);
            }

            $payload = $response->json();
            $expectedClientId = '979965796474-uojacq73meebj0uvb58n42325a184pp1.apps.googleusercontent.com';
            if (($payload['aud'] ?? '') !== $expectedClientId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid client audience'
                ], 400);
            }

            $email = $payload['email'] ?? null;
            if (!$email) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email not provided by Google account'
                ], 400);
            }

            $user = Employee::where('google_email', $email)
                ->orWhere('email', $email)
                ->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'This Google account is not associated with any employee profile. Please contact the administrator to link your Gmail.'
                ]);
            }

            if (!$user->google_email) {
                $user->google_email = $email;
            }

            if (!empty($payload['picture']) && empty($user->profile_image)) {
                $user->profile_image = $payload['picture'];
            }

            $user->save();

            return response()->json([
                'success' => true,
                'user' => [
                    'employee_id' => $user->employee_id,
                    'username' => $user->username,
                    'full_name' => $user->full_name,
                    'role' => $user->role,
                    'email' => $user->email,
                    'google_email' => $user->google_email,
                    'mobile' => $user->mobile,
                    'designation' => $user->designation,
                    'profile_image' => $user->profile_image,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('GOOGLE LOGIN ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Google Authentication Failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function forgotPassword(Request $request)
    {
        try {
            $email = trim((string)$request->input('email'));
            if (!$email) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email is required.'
                ], 400);
            }

            $user = Employee::where('email', $email)->first();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'No account found with this email address.'
                ], 404);
            }

            if ($user->password === 'google_oauth_placeholder') {
                return response()->json([
                    'success' => false,
                    'message' => 'This account uses Google Sign-In. Please sign in using Google.'
                ], 400);
            }

            $otp = (string)random_int(100000, 999999);
            $expiry = Carbon::now()->addMinutes(5);

            $user->otp_code = $otp;
            $user->otp_expiry = $expiry;
            $user->save();

            Log::info("OTP generated for {$user->email}: {$otp}");

            return response()->json([
                'success' => true,
                'message' => 'OTP sent successfully to your registered email.'
            ]);
        } catch (\Exception $e) {
            Log::error('FORGOT PASSWORD ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to process forgot password request: ' . $e->getMessage()
            ], 500);
        }
    }

    public function verifyOtp(Request $request)
    {
        try {
            $email = trim((string)$request->input('email'));
            $otpCode = trim((string)$request->input('otp_code'));

            if (!$email || !$otpCode) {
                return response()->json([
                    'success' => false,
                    'message' => 'Missing email or OTP code.'
                ], 400);
            }

            $user = Employee::where('email', $email)->first();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee profile not found.'
                ], 404);
            }

            if (!$user->otp_code || $user->otp_code !== $otpCode) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid OTP code.'
                ], 400);
            }

            if (Carbon::now()->greaterThan(Carbon::parse($user->otp_expiry))) {
                return response()->json([
                    'success' => false,
                    'message' => 'OTP code has expired.'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'OTP verified successfully.'
            ]);
        } catch (\Exception $e) {
            Log::error('VERIFY OTP ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to verify OTP: ' . $e->getMessage()
            ], 500);
        }
    }

    public function resetPassword(Request $request)
    {
        try {
            $email = trim((string)$request->input('email'));
            $otpCode = trim((string)$request->input('otp_code'));
            $newPassword = (string)$request->input('new_password');

            if (!$email || !$otpCode || empty($newPassword)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Missing email, OTP code, or new password.'
                ], 400);
            }

            $user = Employee::where('email', $email)->first();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee profile not found.'
                ], 404);
            }

            if (!$user->otp_code || $user->otp_code !== $otpCode) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid OTP code.'
                ], 400);
            }

            if (Carbon::now()->greaterThan(Carbon::parse($user->otp_expiry))) {
                return response()->json([
                    'success' => false,
                    'message' => 'OTP code has expired.'
                ], 400);
            }

            $user->password = $newPassword;
            $user->otp_code = null;
            $user->otp_expiry = null;
            $user->save();

            AuditLog::create([
                'action_name' => 'PASSWORD_RESET_VIA_OTP',
                'details' => "User (ID: {$user->employee_id}) successfully reset their password via Email OTP.",
                'severity' => 'INFO'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Password reset completed successfully.'
            ]);
        } catch (\Exception $e) {
            Log::error('RESET PASSWORD ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to reset password: ' . $e->getMessage()
            ], 500);
        }
    }
}
