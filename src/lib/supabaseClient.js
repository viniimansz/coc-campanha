import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://qqampfphvenefeuleumh.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_KL2R7Xrxh2HRNbXCpNKJMQ_qp7Zu4-M';
export const GUARDIAN_EMAIL = 'viniimansz@gmail.com';
export const MAX_CHARACTERS = 10;

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
