<?php

namespace App\Http\Controllers;

use App\Models\Wishlist;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
  public function index(Request $request)
  {
    return response()->json(
      Wishlist::with('product')
        ->where('user_id', $request->user()->id)
        ->get()
    );
  }

  public function store(Request $request)
  {
    $data = $request->validate(['product_id' => 'required|exists:products,id']);

    $item = Wishlist::firstOrCreate([
      'user_id'    => $request->user()->id,
      'product_id' => $data['product_id'],
    ]);

    return response()->json($item, 201);
  }

  public function destroy(Request $request, $productId)
  {
    Wishlist::where('user_id', $request->user()->id)
      ->where('product_id', $productId)
      ->delete();

    return response()->json(['message' => 'Removed']);
  }
}
