<?php

namespace App\Http\Controllers\Api\Admin;

use App\Constants\Roles;
use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\Role;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SellerManagementController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->input('per_page', 20);
        $perPage = in_array($perPage, [10, 20, 50, 100]) ? $perPage : 20;

        $query = User::whereHas('role', fn($q) => $q->where('name', Roles::DEALER))->with('group');

        if ($search = $request->input('q')) {
            $query->where(fn($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
                ->orWhere('company_name', 'like', "%{$search}%")
                ->orWhere('gst_number', 'like', "%{$search}%")
                ->orWhere('city', 'like', "%{$search}%")
                ->orWhere('state', 'like', "%{$search}%")
                ->orWhereHas('group', fn($groupQuery) => $groupQuery->where('name', 'like', "%{$search}%")));
        }
        if ($groupId = $request->input('group_id')) {
            $query->where('group_id', $groupId);
        }
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        switch ($request->input('sort_by', 'newest')) {
            case 'name_asc':
                $query->orderBy('name');
                break;
            case 'name_desc':
                $query->orderByDesc('name');
                break;
            case 'company_asc':
                $query->orderBy('company_name')->orderBy('name');
                break;
            case 'credit_desc':
                $query->orderByDesc('credit_limit')->orderBy('name');
                break;
            default:
                $query->latest();
                break;
        }

        return response()->json($query->paginate($perPage));
    }

    // ✅ NEW: Store a new seller (password removed)
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'required|string|unique:users,phone',
            // 'password' => 'required|string|min:8',  // ✅ REMOVED
            'company_name' => 'nullable|string|max:255',
            'gst_number' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'state' => 'nullable|string',
            'pincode' => 'nullable|string',
            'group_id' => 'nullable|exists:groups,id',
            'credit_limit' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $role = Role::where('name', Roles::DEALER)->firstOrFail();

        // Generate a random password if not provided (or set a default)
        $tempPassword = Str::random(12);

        $seller = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'password' => Hash::make($tempPassword), // ✅ Auto-generate temp password
            'company_name' => $data['company_name'] ?? null,
            'gst_number' => $data['gst_number'] ?? null,
            'address' => $data['address'] ?? null,
            'city' => $data['city'] ?? null,
            'state' => $data['state'] ?? null,
            'pincode' => $data['pincode'] ?? null,
            'group_id' => $data['group_id'] ?? null,
            'credit_limit' => $data['credit_limit'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'role_id' => $role->id,
        ]);

        ActivityLogger::log($request->user()->id, User::class, $seller->id, 'seller_created', [], $seller->toArray());

        return response()->json([
            'message' => 'Seller created successfully.',
            'data' => $seller->load('group'),
        ], 201);
    }

    // ✅ Updated: Edit seller (password removed)
    public function update(Request $request, User $seller)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $seller->id,
            'phone' => 'sometimes|string|unique:users,phone,' . $seller->id,
            // 'password' => 'nullable|string|min:8',  // ✅ REMOVED
            'company_name' => 'sometimes|nullable|string|max:255',
            'gst_number' => 'sometimes|nullable|string|max:20',
            'address' => 'sometimes|nullable|string',
            'city' => 'sometimes|nullable|string',
            'state' => 'sometimes|nullable|string',
            'pincode' => 'sometimes|nullable|string',
            'group_id' => 'sometimes|nullable|exists:groups,id',
            'credit_limit' => 'sometimes|numeric|min:0',
            'outstanding_amount' => 'sometimes|numeric|min:0',
            'is_active' => 'sometimes|boolean',
            'is_blocked' => 'sometimes|boolean',
        ]);

        // ✅ Password logic removed entirely
        // Only update password if provided
        // if (!empty($data['password'])) {
        //     $data['password'] = Hash::make($data['password']);
        // } else {
        //     unset($data['password']);
        // }

        $old = $seller->only(array_keys($data));
        $seller->update($data);

        ActivityLogger::log(
            $request->user()->id,
            User::class,
            $seller->id,
            'seller_updated',
            $old,
            $data
        );

        return response()->json([
            'message' => 'Seller updated successfully.',
            'data' => $seller->fresh()->load('group'),
        ]);
    }

    // PATCH /api/admin/sellers/{seller}/group { group_id } — "Move To Group"
    public function moveToGroup(Request $request, User $seller)
    {
        $request->validate(['group_id' => 'required|exists:groups,id']);
        $old = $seller->group_id;
        $seller->update(['group_id' => $request->group_id]);
        ActivityLogger::log($request->user()->id, User::class, $seller->id, 'group_changed', ['group_id' => $old], ['group_id' => $request->group_id]);
        return response()->json(['message' => 'Seller moved to new group.', 'data' => $seller->load('group')]);
    }

    // PATCH /api/admin/sellers/{seller}/block
    public function toggleBlock(Request $request, User $seller)
    {
        $seller->update(['is_blocked' => !$seller->is_blocked]);
        ActivityLogger::log($request->user()->id, User::class, $seller->id, $seller->is_blocked ? 'blocked' : 'unblocked');
        return response()->json(['message' => $seller->is_blocked ? 'Seller blocked.' : 'Seller unblocked.', 'data' => $seller]);
    }

    // PATCH /api/admin/sellers/{seller}/activate
    public function toggleActive(Request $request, User $seller)
    {
        $seller->update(['is_active' => !$seller->is_active]);
        return response()->json(['message' => $seller->is_active ? 'Seller activated.' : 'Seller deactivated.', 'data' => $seller]);
    }

    // PATCH /api/admin/sellers/{seller}/password { password }
    public function changePassword(Request $request, User $seller)
    {
        $request->validate(['password' => 'required|string|min:8']);
        $seller->update(['password' => Hash::make($request->password)]);
        return response()->json(['message' => 'Password updated for seller.']);
    }

    // ✅ NEW: Show single seller
    public function show(User $seller)
    {
        return response()->json([
            'data' => $seller->load('group', 'orders')
        ]);
    }

    // ✅ NEW: Delete seller
    public function destroy(Request $request, User $seller)
    {
        // Prevent deleting self
        if ($seller->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot delete yourself.'], 422);
        }

        $seller->delete();
        ActivityLogger::log($request->user()->id, User::class, $seller->id, 'seller_deleted');
        return response()->json(['message' => 'Seller deleted.']);
    }
}
