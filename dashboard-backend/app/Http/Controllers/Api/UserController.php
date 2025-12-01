<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\OrganizationSetting;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;


class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $users = User::all();
        return response()->json($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'username' => 'required|string|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:traites_manager,clients_manager,admin,super_admin',
            'ville' => 'nullable|string|max:255',
        ]);

        // Map role name to role_id
        $role = Role::where('name', $request->role)->first();
        $roleId = $role ? $role->id : null;

        $user = User::create([
            'username' => $request->username,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'role_id' => $roleId,
            'ville' => $request->ville,
        ]);

        return response()->json($user, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $user = User::findOrFail($id);
        return response()->json($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'username' => ['required', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:8',
            'role' => 'required|string|in:traites_manager,clients_manager,admin,super_admin',
            'ville' => 'nullable|string|max:255',
        ]);

        // Map role name to role_id
        $role = Role::where('name', $request->role)->first();
        $roleId = $role ? $role->id : null;

        $userData = $request->only(['username', 'role', 'ville']);
        $userData['role_id'] = $roleId;
        
        // Only update password if provided
        if ($request->filled('password')) {
            $userData['password'] = Hash::make($request->password);
        }

        $user->update($userData);

        return response()->json($user);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $user = User::findOrFail($id);
        
        // Prevent deleting the last admin user
        $adminCount = User::where('role', 'admin')->count();
        if ($user->role === 'admin' && $adminCount <= 1) {
            return response()->json(['error' => 'Cannot delete the last administrator'], 400);
        }
        
        $user->delete();
        
        return response()->json(['message' => 'User deleted successfully']);
    }
    
    /**
     * Get all permissions
     */
    public function getPermissions()
    {
        $permissions = Permission::all();
        return response()->json($permissions);
    }
    
    /**
     * Get user permissions
     */
    public function getUserPermissions(string $id)
    {
        $user = User::findOrFail($id);
        $permissions = $user->getPermissions();
        return response()->json($permissions);
    }
    
    /**
     * Update user permissions
     */
    public function updateUserPermissions(Request $request, string $id)
    {
        $user = User::findOrFail($id);
        
        $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'string|exists:permissions,name'
        ]);
        
        // Set user permissions
        $user->setPermissions($request->permissions);
        
        return response()->json([
            'message' => 'Permissions updated successfully',
            'permissions' => $user->getPermissions()
        ]);
    }
    
    /**
     * Get organization settings
     */
    public function getOrganizationSettings()
    {
        $settings = OrganizationSetting::first();
        
        if (!$settings) {
            // Créer une entrée vide si elle n'existe pas
            $settings = OrganizationSetting::create([
                'name' => null,
                'logo' => null
            ]);
        }
        
        // Retourner l'URL complète du logo
        $response = [
            'id' => $settings->id,
            'name' => $settings->name,
            'logo' => $settings->logo ? url('storage/' . $settings->logo) : null, // Changé ici
            'created_at' => $settings->created_at,
            'updated_at' => $settings->updated_at
        ];
        
        return response()->json($response);
    }
    
    /**
     * Update organization settings
     */
    public function updateOrganizationSettings(Request $request)
    {
        $request->validate([
            'name' => 'nullable|string|max:255',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048'
        ]);
        
        // Récupérer ou créer les paramètres
        $settings = OrganizationSetting::first();
        if (!$settings) {
            $settings = new OrganizationSetting();
        }
        
        // Mettre à jour le nom
        if ($request->has('name')) {
            $settings->name = $request->name;
        }
        
        // Gérer l'upload du logo
        if ($request->hasFile('logo')) {
            // Supprimer l'ancien logo si il existe
            if ($settings->logo && Storage::disk('public')->exists($settings->logo)) {
                Storage::disk('public')->delete($settings->logo);
            }
            
            // Stocker le nouveau logo
            $logoPath = $request->file('logo')->store('logos', 'public');
            $settings->logo = $logoPath;
        }
        
        $settings->save();
        
        // Retourner l'URL complète du logo
        $response = [
            'id' => $settings->id,
            'name' => $settings->name,
             'logo' => $settings->logo ? url('storage/' . $settings->logo) : null, // Changé ici
            'created_at' => $settings->created_at,
            'updated_at' => $settings->updated_at
        ];
        
        return response()->json($response);
    }
}