<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Traite extends Model
{
    use HasFactory;

    protected $table = 'traites';

    protected $guarded = [];

    // Valeur par défaut pour statut si non fourni
    protected $attributes = [
        'statut' => 'Non échu',
    ];
}


