<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use Illuminate\Http\Request;

class ContactController extends Controller
{
  public function store(Request $request)
  {
    $data = $request->validate([
      'name'    => 'required|string|max:255',
      'email'   => 'required|email',
      'message' => 'required|string',
    ]);

    return response()->json(Contact::create($data), 201);
  }
}
