<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    /**
     * List activity logs with server-side pagination.
     *
     * Query params:
     * - page       (int)    : page number
     * - per_page   (int)    : items per page (default 20, max 100)
     * - user_id    (int)    : filter by user
     * - action     (string) : filter by action key
     * - search     (string) : search in description
     */
    public function index(Request $request)
    {
        $query = ActivityLog::query()->with('user')->orderByDesc('created_at');

        if ($userId = $request->query('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($action = $request->query('action')) {
            $query->where('action', $action);
        }

        if ($search = $request->query('search')) {
            $query->where('description', 'like', '%' . $search . '%');
        }

        $perPage = min((int) $request->query('per_page', 20), 100);

        return response()->json($query->paginate($perPage));
    }
}

