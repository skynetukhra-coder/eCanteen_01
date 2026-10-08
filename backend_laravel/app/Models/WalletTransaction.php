<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    protected $table = 'wallet_transactions';
    protected $primaryKey = 'transaction_id';
    const UPDATED_AT = null;

    protected $fillable = [
        'employee_id',
        'type',
        'amount',
        'title',
        'status',
        'utr_number',
        'payment_method',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'employee_id');
    }
}
