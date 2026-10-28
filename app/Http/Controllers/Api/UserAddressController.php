<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserAddressController extends Controller
{
    public function index(Request $request)
    {
        return response()->json([
            'data' => $request->user()->addresses()
                ->orderByDesc('is_default')->latest()->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $user = $request->user();

        $address = DB::transaction(function () use ($user, $data) {
            $makeDefault = ($data['is_default'] ?? false) || !$user->addresses()->exists();
            if ($makeDefault) $user->addresses()->update(['is_default' => false]);
            return $user->addresses()->create([...$data, 'is_default' => $makeDefault]);
        });

        return response()->json(['message' => 'Address saved.', 'data' => $address], 201);
    }

    public function update(Request $request, UserAddress $address)
    {
        $this->authorizeOwner($request, $address);
        $data = $this->validated($request);

        DB::transaction(function () use ($request, $address, $data) {
            if ($data['is_default'] ?? false) {
                $request->user()->addresses()->where('id', '!=', $address->id)->update(['is_default' => false]);
            }
            $address->update($data);
        });

        return response()->json(['message' => 'Address updated.', 'data' => $address->fresh()]);
    }

    public function setDefault(Request $request, UserAddress $address)
    {
        $this->authorizeOwner($request, $address);
        DB::transaction(function () use ($request, $address) {
            $request->user()->addresses()->update(['is_default' => false]);
            $address->update(['is_default' => true]);
        });
        return response()->json(['message' => 'Default address updated.', 'data' => $address->fresh()]);
    }

    public function destroy(Request $request, UserAddress $address)
    {
        $this->authorizeOwner($request, $address);
        $wasDefault = $address->is_default;
        $address->delete();
        if ($wasDefault) $request->user()->addresses()->latest()->first()?->update(['is_default' => true]);
        return response()->json(['message' => 'Address removed.']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'label' => 'required|string|max:50',
            'recipient_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:25',
            'address_line' => 'required|string|max:1000',
            'city' => 'required|string|max:100',
            'state' => 'required|string|max:100',
            'pincode' => 'required|string|max:12',
            'country' => 'required|string|max:100',
            'is_default' => 'sometimes|boolean',
        ]);
    }

    private function authorizeOwner(Request $request, UserAddress $address): void
    {
        abort_unless($address->user_id === $request->user()->id, 404);
    }
}
