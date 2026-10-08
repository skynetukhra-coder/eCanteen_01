<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    protected $table = 'employee';
    protected $primaryKey = 'employee_id';

    protected $fillable = [
        'username',
        'password',
        'full_name',
        'role',
        'email',
        'google_email',
        'mobile',
        'designation',
        'profile_image',
        'otp_code',
        'otp_expiry',
    ];

    protected $hidden = [
        'password',
        'otp_code',
    ];

    public function wallet()
    {
        return $this->hasOne(Wallet::class, 'employee_id', 'employee_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'employee_id', 'employee_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'employee_id', 'employee_id');
    }

    public function walletTransactions()
    {
        return $this->hasMany(WalletTransaction::class, 'employee_id', 'employee_id');
    }
}
