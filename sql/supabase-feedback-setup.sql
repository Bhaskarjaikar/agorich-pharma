-- SQL to create feedback table in Supabase
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    email TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback
CREATE POLICY "Allow anonymous insert" ON public.feedback
    FOR INSERT TO anon WITH CHECK (true);

-- Allow authenticated users to view their own feedback (optional)
CREATE POLICY "Allow authenticated select" ON public.feedback
    FOR SELECT TO authenticated USING (true);
