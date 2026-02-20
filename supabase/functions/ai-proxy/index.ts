// @ts-nocheck
// Supabase Edge Function: AI Proxy
// Securely forwards AI requests to Zhipu AI (GLM-4) without exposing the API key to the frontend.
//
// Deploy with: supabase functions deploy ai-proxy --no-verify-jwt
// Set secret: supabase secrets set ZHIPU_API_KEY=your-api-key
//
// Note: This uses the Deno runtime (Supabase Edge Functions run on Deno).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Verify JWT
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Get AI API Key from environment
        const zhipuApiKey = Deno.env.get('ZHIPU_API_KEY');
        if (!zhipuApiKey) {
            return new Response(JSON.stringify({ error: 'AI API key not configured' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Parse request body
        const { model, messages, response_format } = await req.json();

        // Forward to Zhipu AI (OpenAI-compatible endpoint)
        const aiResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${zhipuApiKey}`,
            },
            body: JSON.stringify({
                model: model || 'glm-4-flash',
                messages,
                ...(response_format ? { response_format } : {}),
            }),
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error('Zhipu AI error:', errorText);
            return new Response(JSON.stringify({ error: 'AI service error', details: errorText }), {
                status: 502,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || '';

        return new Response(JSON.stringify({ content }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Edge Function error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
