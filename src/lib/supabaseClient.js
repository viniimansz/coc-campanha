import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://xxybrqbiozggnbkbboft.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_NIa6sbIhDtai09QlIH3HHQ_n6BdnTXl';
export const GUARDIAN_EMAIL = 'viniimansz@gmail.com';
export const MAX_CHARACTERS = 10;

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
