<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Offer;
use App\Models\OfferProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OfferAdminController extends Controller
{
    public function index() { return response()->json(['data' => Offer::with('products.product:id,name')->latest()->get()]); }

    // POST /api/admin/offers { name, offer_type, discount_percentage?, flat_discount?, coupon_code?, start_date, end_date, product_ids: [] }
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'offer_type' => 'required|in:percentage,flat,coupon',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'flat_discount' => 'nullable|numeric|min:0',
            'coupon_code' => 'nullable|string|unique:offers,coupon_code',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'exists:products,id',
        ]);

        $offer = Offer::create([
            ...collect($data)->except('product_ids')->toArray(),
            'slug' => Str::slug($data['name']) . '-' . Str::random(5),
        ]);

        foreach ($data['product_ids'] ?? [] as $productId) {
            OfferProduct::create([
                'offer_id' => $offer->id,
                'product_id' => $productId,
                'discount_percentage' => $data['discount_percentage'] ?? null,
            ]);
        }

        return response()->json(['message' => 'Offer created.', 'data' => $offer->load('products')], 201);
    }

    public function update(Request $request, Offer $offer)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'is_active' => 'sometimes|boolean',
            'end_date' => 'sometimes|date',
        ]);
        $offer->update($data);
        return response()->json(['data' => $offer]);
    }

    public function destroy(Offer $offer)
    {
        $offer->delete();
        return response()->json(['message' => 'Offer deleted.']);
    }
}
