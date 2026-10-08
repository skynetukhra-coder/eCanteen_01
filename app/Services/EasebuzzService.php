<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EasebuzzService
{
    public string $key;
    public string $salt;
    public string $env;
    public string $baseUrl;

    public function __construct()
    {
        $this->key = env('EASEBUZZ_KEY', 'PCG0NDPL0');
        $this->salt = env('EASEBUZZ_SALT', 'S4KSFDOFV');
        $this->env = strtolower(env('EASEBUZZ_ENV', 'test'));
        $this->baseUrl = ($this->env === 'prod')
            ? 'https://pay.easebuzz.in'
            : 'https://testpay.easebuzz.in';
    }

    /**
     * Generate SHA-512 hash for Easebuzz Initiate Payment API
     * Sequence:
     * key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
     */
    public function generateInitiateHash(array $params): string
    {
        $amtStr = number_format((float)($params['amount'] ?? 0), 2, '.', '');
        $txnid = (string)($params['txnid'] ?? '');
        $productinfo = (string)($params['productinfo'] ?? 'Canteen Payment');
        $firstname = (string)($params['firstname'] ?? 'Customer');
        $email = (string)($params['email'] ?? 'canteen@wb.gov.in');
        $udf1 = (string)($params['udf1'] ?? '');
        $udf2 = (string)($params['udf2'] ?? '');
        $udf3 = (string)($params['udf3'] ?? '');
        $udf4 = (string)($params['udf4'] ?? '');
        $udf5 = (string)($params['udf5'] ?? '');
        $udf6 = (string)($params['udf6'] ?? '');
        $udf7 = (string)($params['udf7'] ?? '');

        $hashSequence = implode('|', [
            $this->key,
            $txnid,
            $amtStr,
            $productinfo,
            $firstname,
            $email,
            $udf1,
            $udf2,
            $udf3,
            $udf4,
            $udf5,
            $udf6,
            $udf7,
            '', // udf8
            '', // udf9
            '', // udf10
            $this->salt
        ]);

        return hash('sha512', $hashSequence);
    }

    /**
     * Verify reverse SHA-512 hash returned in Easebuzz response
     * Sequence:
     * salt|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
     */
    public function verifyResponseHash(array $responseBody): bool
    {
        if (empty($responseBody) || empty($responseBody['hash'])) {
            return false;
        }

        $amtStr = number_format((float)($responseBody['amount'] ?? 0), 2, '.', '');
        $status = (string)($responseBody['status'] ?? '');
        $udf10 = (string)($responseBody['udf10'] ?? '');
        $udf9 = (string)($responseBody['udf9'] ?? '');
        $udf8 = (string)($responseBody['udf8'] ?? '');
        $udf7 = (string)($responseBody['udf7'] ?? '');
        $udf6 = (string)($responseBody['udf6'] ?? '');
        $udf5 = (string)($responseBody['udf5'] ?? '');
        $udf4 = (string)($responseBody['udf4'] ?? '');
        $udf3 = (string)($responseBody['udf3'] ?? '');
        $udf2 = (string)($responseBody['udf2'] ?? '');
        $udf1 = (string)($responseBody['udf1'] ?? '');
        $email = (string)($responseBody['email'] ?? '');
        $firstname = (string)($responseBody['firstname'] ?? '');
        $productinfo = (string)($responseBody['productinfo'] ?? '');
        $txnid = (string)($responseBody['txnid'] ?? '');

        $reverseSequence = implode('|', [
            $this->salt,
            $status,
            $udf10,
            $udf9,
            $udf8,
            $udf7,
            $udf6,
            $udf5,
            $udf4,
            $udf3,
            $udf2,
            $udf1,
            $email,
            $firstname,
            $productinfo,
            $amtStr,
            $txnid,
            $this->key
        ]);

        $calculatedHash = hash('sha512', $reverseSequence);
        $isValid = (strtolower($calculatedHash) === strtolower((string)$responseBody['hash']));

        if (!$isValid) {
            Log::warning("[Easebuzz] Reverse hash mismatch. Expected: {$calculatedHash}, Received: " . ($responseBody['hash'] ?? ''));
        }

        return $isValid;
    }

    /**
     * Initiate Payment via Easebuzz API
     */
    public function initiatePayment(array $data): array
    {
        try {
            $formattedAmount = number_format((float)$data['amount'], 2, '.', '');
            $rawPhone = preg_replace('/[^0-9]/', '', (string)($data['phone'] ?? ''));
            $safePhone = strlen($rawPhone) >= 10 ? substr($rawPhone, -10) : '9999999999';

            $rawEmail = trim((string)($data['email'] ?? ''));
            $safeEmail = filter_var($rawEmail, FILTER_VALIDATE_EMAIL) ? $rawEmail : 'canteen@wb.gov.in';

            $safeName = trim((string)($data['firstname'] ?? 'Customer'));
            if (empty($safeName)) {
                $safeName = 'Employee';
            }

            $txnid = (string)$data['txnid'];
            $productinfo = (string)($data['productinfo'] ?? 'Canteen Payment');
            $surl = (string)($data['surl'] ?? '');
            $furl = (string)($data['furl'] ?? '');
            $udf1 = (string)($data['udf1'] ?? '');
            $udf2 = (string)($data['udf2'] ?? '');
            $udf3 = (string)($data['udf3'] ?? '');
            $udf4 = (string)($data['udf4'] ?? '');
            $udf5 = (string)($data['udf5'] ?? '');

            $hash = $this->generateInitiateHash([
                'txnid' => $txnid,
                'amount' => $formattedAmount,
                'productinfo' => $productinfo,
                'firstname' => $safeName,
                'email' => $safeEmail,
                'udf1' => $udf1,
                'udf2' => $udf2,
                'udf3' => $udf3,
                'udf4' => $udf4,
                'udf5' => $udf5,
            ]);

            $postData = [
                'key' => $this->key,
                'txnid' => $txnid,
                'amount' => $formattedAmount,
                'productinfo' => $productinfo,
                'firstname' => $safeName,
                'phone' => $safePhone,
                'email' => $safeEmail,
                'surl' => $surl,
                'furl' => $furl,
                'hash' => $hash,
                'udf1' => $udf1,
                'udf2' => $udf2,
                'udf3' => $udf3,
                'udf4' => $udf4,
                'udf5' => $udf5,
            ];

            $initiateUrl = "{$this->baseUrl}/payment/initiateLink";
            Log::info("[Easebuzz] Initiating payment for txnid: {$txnid}, amount: ₹{$formattedAmount} at {$initiateUrl}");

            $response = Http::asForm()
                ->timeout(15)
                ->withHeaders([
                    'Accept' => 'application/json',
                ])
                ->post($initiateUrl, $postData);

            $responseData = $response->json();

            if ($response->successful() && isset($responseData['status']) && (int)$responseData['status'] === 1 && !empty($responseData['data'])) {
                return [
                    'success' => true,
                    'access_key' => $responseData['data'],
                    'txnid' => $txnid,
                    'key' => $this->key,
                    'env' => $this->env,
                ];
            }

            $errMsg = is_string($responseData['data'] ?? null)
                ? $responseData['data']
                : json_encode($responseData['data'] ?? 'Failed to generate access key');

            Log::error("[Easebuzz] Initiate error response:", (array)$responseData);

            return [
                'success' => false,
                'message' => $errMsg,
            ];
        } catch (\Exception $e) {
            Log::error("[Easebuzz] Request error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }
}
