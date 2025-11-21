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
        ]);

        $user = User::create([
            'username' => $request->username,
            'password' => Hash::make($request->password),
            'role' => $request->role,
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
            'role' => 'required|string|in:admin,manager,user',
            'ville' => 'nullable|string|max:255',
        ]);

        $userData = $request->only(['username', 'role', 'ville']);
        
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
        // For now, we'll store organization settings in the config or a dedicated table
        // In a real application, you might want to create a separate settings table
        $settings = [
            'name' => config('app.name', 'CFAO MOBILITY CAMEROON'),
            'logo' => config('app.logo', '/images/LOGO.png')
        ];
        
        return response()->json($settings);
    }
    
    /**
     * Update organization settings
     */
    public function updateOrganizationSettings(Request $request)
    {
        // In a real application, you would save these settings to a database table
        // For now, we'll just return the updated settings
        $request->validate([
            'name' => 'nullable|string|max:255',
            'logo' => 'nullable|string|max:255'
        ]);
        
        $settings = [
            'name' => $request->input('name', config('app.name', 'CFAO MOBILITY CAMEROON')),
            'logo' => $request->input('logo', config('app.logo', '/images/LOGO.png'))
        ];
        
        // In a real application, you would save these to a database
        // For now, we just return them
        return response()->json($settings);
    }
}