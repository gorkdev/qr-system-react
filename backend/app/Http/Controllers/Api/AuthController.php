<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'E-posta veya şifre hatalı.',
            ], 401);
        }

        // Eski tokenları temizle
        $user->tokens()->delete();

        $token = $user->createToken('auth-token')->plainTextToken;

        ActivityLog::create([
            'user_id'      => $user->id,
            'action'       => 'login',
            'subject_type' => User::class,
            'subject_id'   => $user->id,
            'description'  => 'Kullanıcı giriş yaptı.',
            'ip_address'   => $request->ip(),
            'user_agent'   => (string) $request->header('User-Agent'),
        ]);

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();

        ActivityLog::create([
            'user_id'      => $user->id,
            'action'       => 'logout',
            'subject_type' => User::class,
            'subject_id'   => $user->id,
            'description'  => 'Kullanıcı çıkış yaptı.',
            'ip_address'   => $request->ip(),
            'user_agent'   => (string) $request->header('User-Agent'),
        ]);

        return response()->json(['message' => 'Çıkış yapıldı.']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'new_password'     => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Mevcut şifre hatalı.',
            ], 422);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        ActivityLog::create([
            'user_id'      => $user->id,
            'action'       => 'password_changed',
            'subject_type' => User::class,
            'subject_id'   => $user->id,
            'description'  => 'Kullanıcı şifresini değiştirdi.',
            'ip_address'   => $request->ip(),
            'user_agent'   => (string) $request->header('User-Agent'),
        ]);

        return response()->json(['message' => 'Şifre başarıyla değiştirildi.']);
    }
}
