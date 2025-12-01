<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Role;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'username',
        'password',
        'role',
        'role_id',
        'ville'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'password' => 'hashed',
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
        
        // Merge and remove duplicates
        $allPermissions = array_unique(array_merge($rolePermissions, $directPermissions));
        
        return $allPermissions;
    }
    
    public function setPermissions(array $permissions)
    {
        // Sync direct permissions
        $permissionModels = Permission::whereIn('name', $permissions)->get();
        $this->directPermissions()->sync($permissionModels->pluck('id')->toArray());
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