<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $request->username)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Nom d\'utilisateur ou mot de passe incorrect.'
            ], 401);
        }

        // Charger la relation role avec ses permissions
        $user->load('roleModel.permissions');

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'role_id' => $user->role_id,
                'role' => $user->roleModel ? [
                    'id' => $user->roleModel->id,
                    'name' => $user->roleModel->name,
                    'description' => $user->roleModel->description,
                ] : null,
            ],
            'permissions' => $user->getPermissions(),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Déconnexion réussie']);
    }

    public function user(Request $request)
    {
        $user = $request->user();
        
        // Charger la relation role avec ses permissions
        $user->load('roleModel.permissions');
        
        return response()->json([
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'role_id' => $user->role_id,
                'role' => $user->roleModel ? [
                    'id' => $user->roleModel->id,
                    'name' => $user->roleModel->name,
                    'description' => $user->roleModel->description,
                ] : null,
            ],
            'permissions' => $user->getPermissions(),
        ]);
    }
}