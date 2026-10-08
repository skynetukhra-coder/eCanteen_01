<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $table = 'audit_logs';
    protected $primaryKey = 'log_id';
    const UPDATED_AT = null;

    protected $fillable = [
        'action_name',
        'details',
        'severity',
    ];
}
