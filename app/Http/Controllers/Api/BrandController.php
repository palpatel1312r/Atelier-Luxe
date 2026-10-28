<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;

class BrandController extends Controller
{
    // GET /api/brands
    public function index()
    {
        return response()->json(['data' => Brand::where('is_active', true)->orderBy('name')->get()]);
    }
}
