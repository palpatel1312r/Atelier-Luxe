<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SavedFilterController extends Controller
{
  public function index(Request $request)
  {
    // TODO: implement later
    return response()->json(['data' => []]);
  }

  public function store(Request $request)
  {
    // TODO: implement later
    return response()->json(['message' => 'Not implemented yet'], 501);
  }

  public function destroy($id)
  {
    // TODO: implement later
    return response()->json(['message' => 'Not implemented yet'], 501);
  }
}
