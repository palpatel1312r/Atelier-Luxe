<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Offer;
use Illuminate\Http\Request;

/**
 * Was in the DB schema (OFFERS, OFFER_PRODUCTS tables) and referenced by the
 * dashboard's "Offers" count card and the "Offer" product label, but had no
 * actual browse/redeem endpoints — this closes that gap.
 */
class OfferController extends Controller
{
    // GET /api/offers — active offers, for a dedicated "Offers" screen
    public function index()
    {
        $offers = Offer::where('is_active', true)
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->with('products.product:id,name,slug')
            ->latest()
            ->get();

        return response()->json(['data' => $offers]);
    }

    // GET /api/offers/validate-coupon?code=XYZ — checkout-time coupon check
    public function validateCoupon(Request $request)
    {
        $request->validate(['code' => 'required|string']);

        $offer = Offer::where('coupon_code', $request->code)
            ->where('is_active', true)
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->first();

        if (!$offer) {
            return response()->json(['message' => 'Invalid or expired coupon code.'], 404);
        }

        return response()->json(['data' => $offer]);
    }
}
