<?php

namespace App\Services;

class WalletService
{
    protected string $secret;

    public function __construct()
    {
        $this->secret = config('services.wallet.secret', env('WALLET_HMAC_SECRET', 'canteen_wallet_integrity_key'));
    }

    /**
     * Generate HMAC-SHA256 signature for wallet integrity check
     */
    public function generateSignature(int|string $employeeId, float|string $balance): string
    {
        $formattedBalance = number_format((float)$balance, 2, '.', '');
        return hash_hmac('sha256', "{$employeeId}:{$formattedBalance}", $this->secret);
    }

    /**
     * Verify wallet signature matches expected hash
     */
    public function verifySignature(int|string $employeeId, float|string $balance, ?string $signature): bool
    {
        if (empty($signature)) {
            return false;
        }
        $expected = $this->generateSignature($employeeId, $balance);
        return hash_equals($expected, $signature);
    }
}
