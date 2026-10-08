<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreIssue extends Model
{
    protected $table = 'store_issues';
    protected $primaryKey = 'issue_id';
    public $timestamps = false;

    protected $fillable = [
        'item_code',
        'item_name',
        'quantity',
        'remarks',
        'issued_date',
    ];
}
