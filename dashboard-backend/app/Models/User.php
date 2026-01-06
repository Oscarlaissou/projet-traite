<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Role;
use Illuminate\Support\Facades\Log;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'username',
        'password',
        'role',
        'role_id',
        'ville',
        'is_ad_user'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'password' => 'hashed',
        'is_ad_user' => 'boolean',
    ];

    // Relations et méthodes de permissions
    public function roleModel()
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function directPermissions()
    {
        return $this->belongsToMany(Permission::class, 'user_permissions');
    }

    public function hasPermission($permissionName)
    {
        // Check direct permissions first
        if ($this->directPermissions()->where('name', $permissionName)->exists()) {
            return true;
        }
        
        // Fall back to role-based permissions
        return $this->roleModel && $this->roleModel->hasPermission($permissionName);
    }

    public function hasAnyPermission(array $permissions)
    {
        foreach ($permissions as $permission) {
            if ($this->hasPermission($permission)) {
                return true;
            }
        }
        return false;
    }

    public function getPermissions()
    {
        // Get role-based permissions
        $rolePermissions = [];
        if ($this->roleModel) {
            $rolePermissions = $this->roleModel->permissions()->pluck('name')->toArray();
        }
        
        // Get direct permissions
        $directPermissions = $this->directPermissions()->pluck('name')->toArray();
        
        // If user has direct permissions, use only those (override role permissions)
        // Otherwise, use role permissions
        if (!empty($directPermissions)) {
            return $directPermissions;
        }
        
        return $rolePermissions;
    }
    
    public function setPermissions(array $permissions)
    {
        // Log the incoming permissions for debugging
        Log::info('Setting user permissions', [
            'user_id' => $this->id,
            'incoming_permissions' => $permissions
        ]);
        
        // Sync direct permissions
        $permissionModels = Permission::whereIn('name', $permissions)->get();
        
        // Log the found permission models
        Log::info('Found permission models', [
            'count' => $permissionModels->count(),
            'permission_names' => $permissionModels->pluck('name')->toArray()
        ]);
        
        $this->directPermissions()->sync($permissionModels->pluck('id')->toArray());
        
        // Log the final state
        $finalPermissions = $this->directPermissions()->pluck('name')->toArray();
        Log::info('Final user permissions after sync', [
            'user_id' => $this->id,
            'permissions' => $finalPermissions
        ]);
    }
    
    // Method to ensure role_id is synced with role name
    public function setRoleAttribute($value)
    {
        $this->attributes['role'] = $value;
        
        // Automatically set role_id based on role name
        if ($value) {
            $role = Role::where('name', $value)->first();
            $this->attributes['role_id'] = $role ? $role->id : null;
        }
    }
}