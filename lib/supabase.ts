import {createClient} from '@supabase/supabase-js';
// These fallbacks are public project identifiers, NOT service-role credentials.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wmiypacyraepljalppub.supabase.co';
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable__26areTx9RGKKlrakjV9lg_3IP9DwSQ';
export const supabase = createClient(supabaseUrl,publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store',signal:init?.signal || AbortSignal.timeout(10000)})}});
