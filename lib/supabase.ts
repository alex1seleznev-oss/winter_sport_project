import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wmiypacyraepljalppub.supabase.co';
const supabasePublishableKey = 'sb_publishable__26areTx9RGKKlrakjV9lg_3IP9DwSQ';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
