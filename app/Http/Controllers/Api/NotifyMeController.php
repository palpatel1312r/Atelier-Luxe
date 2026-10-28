<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotifyMeRequest;
use Illuminate\Http\Request;

class NotifyMeController extends Controller
{
    // POST /api/notify-me { product_id, variant_id? } — "Notify Me" button on out-of-stock product
    public function store(Request $request)
    {
        $request->validate(['product_id' => 'required|exists:products,id', 'variant_id' => 'nullable|exists:product_variants,id']);
        NotifyMeRequest::firstOrCreate([
            'user_id' => $request->user()->id,
            'product_id' => $request->product_id,
            'variant_id' => $request->variant_id,
        ]);
        return response()->json(['message' => "We'll notify you when this is back in stock."]);
    }
}
