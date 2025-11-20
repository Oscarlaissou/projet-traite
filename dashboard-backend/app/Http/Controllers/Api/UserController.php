<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
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
            'role' => 'required|string|in:admin,manager,user',
            'ville' => 'nullable|string|max:255',
            'logo' => 'nullable|string|max:255'
        ]);

        $user = User::create([
            'username' => $request->username,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'ville' => $request->ville,
            'logo' => $request->logo
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
            'role' => 'required|string|in:admin,manager,user',
            'ville' => 'nullable|string|max:255',
            'logo' => 'nullable|string|max:255'
        ]);

        $userData = $request->only(['username', 'role', 'ville', 'logo']);
        
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
     * Get organization settings
     */
    public function getOrganizationSettings()
    {
        // Get the first admin user or any user to get the organization settings
        $user = User::where('role', 'admin')->first() ?? User::first();
        
        $settings = [
            'name' => config('app.name', 'CFAO MOBILITY CAMEROON'),
            'logo' => $user && $user->logo ? $user->logo : config('app.logo', '/images/LOGO.png')
        ];
        
        return response()->json($settings);
    }
    
    /**
     * Update organization settings
     */
    public function updateOrganizationSettings(Request $request)
    {
        $request->validate([
            'name' => 'nullable|string|max:255',
            'logo' => 'nullable|string|max:255'
        ]);
        
        // Update the first admin user or create one if none exists
        $adminUser = User::where('role', 'admin')->first();
        
        if ($adminUser) {
            $adminUser->update([
                'logo' => $request->input('logo', $adminUser->logo)
            ]);
        }
        
        $settings = [
            'name' => $request->input('name', config('app.name', 'CFAO MOBILITY CAMEROON')),
            'logo' => $request->input('logo', config('app.logo', '/images/LOGO.png'))
        ];
        
        return response()->json($settings);
    }
}