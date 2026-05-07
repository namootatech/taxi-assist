import 'package:supabase_flutter/supabase_flutter.dart';

/// Single access point for the Supabase client after [Supabase.initialize].
///
/// **Security:** All tables are assumed protected with Row Level Security (RLS)
/// on the Supabase project. This app ships only the anon key; every query must
/// respect policies (see tech spec).
SupabaseClient get supabaseClient => Supabase.instance.client;
