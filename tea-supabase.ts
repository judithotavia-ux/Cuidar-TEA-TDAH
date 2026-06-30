import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://spijkpgtfvttwkpsfnjd.supabase.co";
const SUPABASE_KEY = "sb_publishable_dKH11CLlPTuX98a9lLbGig_wEL1XMWM";

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
