<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SavedFilter;
use Illuminate\Http\Request;

/**
 * Was in the DB schema (SAVED_FILTERS table) with no endpoints — lets a
 * dealer save a combination of filters (e.g. "Category=Shirts, InStock=true,
 * PriceMax=500") and re-apply it in one tap instead of rebuilding it every visit.
 */
class SavedFilterController extends Controller
{
    // GET /api/saved-filters
    public function index(Request $request)
    {
        return response()->json(['data' => SavedFilter::where('user_id', $request->user()->id)->latest()->get()]);
    }

    // POST /api/saved-filters { filter_name, filter_conditions: {...} }
    public function store(Request $request)
    {
        $data = $request->validate([
            'filter_name' => 'required|string|max:255',
            'filter_conditions' => 'required|array',
        ]);
        $filter = SavedFilter::create(['user_id' => $request->user()->id, ...$data]);
        return response()->json(['message' => 'Filter saved.', 'data' => $filter], 201);
    }

    // DELETE /api/saved-filters/{id}
    public function destroy(Request $request, int $id)
    {
        SavedFilter::where('user_id', $request->user()->id)->where('id', $id)->delete();
        return response()->json(['message' => 'Filter deleted.']);
    }
}
