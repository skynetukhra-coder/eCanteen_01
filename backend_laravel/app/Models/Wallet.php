<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wallet extends Model
{
    protected $table = 'wallets';
    protected $primaryKey = 'wallet_id';
    const CREATED_AT = null;

    protected $fillable = [
        'employee_id',
        'balance',
        'signature',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'employee_id');
    }
}
