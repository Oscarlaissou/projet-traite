<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PendingClient extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'pending_clients';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'numero_compte',
        'nom_raison_sociale',
        'bp',
        'ville',
        'pays',
        'adresse_geo_1',
        'adresse_geo_2',
        'telephone',
        'email',
        'categorie',
        'n_contribuable',
        'type_tiers',
        'date_creation',
        'montant_facture',
        'montant_paye',
        'credit',
        'motif',
        'etablissement',
        'service',
        'nom_signataire',
        'created_by',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'date_creation' => 'date',
        'montant_facture' => 'decimal:2',
        'montant_paye' => 'decimal:2',
        'credit' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user who created the pending client.
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    /**
     * Accesseur pour s'assurer que created_by_id est toujours disponible
     */
    public function getCreatedByIdAttribute()
    {
        return $this->created_by;
    }
}