<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cashbook extends Model
{
    protected $table = 'cashbook';
    protected $primaryKey = 'cashbook_id';
    const UPDATED_AT = null;

    protected $fillable = [
        'entry_type',
        'amount',
        'description',
        'payment_mode',
        'receipt_path',
        'entry_date',
    ];
}
