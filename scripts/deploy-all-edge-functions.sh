#!/bin/bash
#This is a bash script to deploy all Supabase Edge Functions for the EduDash Pro project.
# Deploy All Edge Functions Script
# Deploys all Supabase Edge Functions to production
# WARP.md Compliance: Production deployment workflow

set -e

echo "🚀 EduDash Pro - Deploy All Edge Functions"
echo "=========================================="
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're linked to a project
if [ ! -f ".git/config" ] || [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory"
    exit 1
fi

# Confirm deployment
echo "⚠️  This will deploy ALL edge functions to production."
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "📋 Edge Functions to Deploy:"
echo "----------------------------"

# Discover functions from directories so inventory stays current.
mapfile -t DISCOVERED_FUNCTIONS < <(find supabase/functions -maxdepth 1 -mindepth 1 -type d -printf "%f\n" | grep -v '^_shared$' | sort)

# Priority deployment order for critical exam/voice flow reliability.
PRIORITY_FUNCTIONS=(
    "stt-proxy"
    "transcribe-audio"
    "transcribe-chunk"
    "generate-exam"
    "grade-exam-attempt"
    "tts-proxy"
)

ALL_FUNCTIONS=()

append_unique() {
    local fn="$1"
    local existing
    for existing in "${ALL_FUNCTIONS[@]}"; do
        if [[ "$existing" == "$fn" ]]; then
            return 0
        fi
    done
    ALL_FUNCTIONS+=("$fn")
}

for fn in "${PRIORITY_FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$fn" ]; then
        append_unique "$fn"
    fi
done

for fn in "${DISCOVERED_FUNCTIONS[@]}"; do
    append_unique "$fn"
done

echo ""
echo "Total functions: ${#ALL_FUNCTIONS[@]}"
echo ""

# Count for progress tracking
TOTAL=${#ALL_FUNCTIONS[@]}
CURRENT=0
SUCCEEDED=0
FAILED=0
FAILED_FUNCTIONS=()

# Deploy each function
for func in "${ALL_FUNCTIONS[@]}"; do
    CURRENT=$((CURRENT + 1))
    echo ""
    echo "[$CURRENT/$TOTAL] Deploying: $func"
    echo "----------------------------------------"
    
    # Check if function directory exists
    if [ ! -d "supabase/functions/$func" ]; then
        echo "⚠️  Skipping $func (directory not found)"
        continue
    fi
    
    # Deploy function
    if supabase functions deploy "$func" --no-verify-jwt 2>&1; then
        echo "✅ $func deployed successfully"
        SUCCEEDED=$((SUCCEEDED + 1))
    else
        echo "❌ $func deployment failed"
        FAILED=$((FAILED + 1))
        FAILED_FUNCTIONS+=("$func")
    fi
    
    # Brief pause to avoid rate limiting
    sleep 1
done

echo ""
echo "=========================================="
echo "📊 Deployment Summary"
echo "=========================================="
echo "Total functions: $TOTAL"
echo "✅ Successful: $SUCCEEDED"
echo "❌ Failed: $FAILED"
echo ""

if [ ${#FAILED_FUNCTIONS[@]} -gt 0 ]; then
    echo "Failed functions:"
    for func in "${FAILED_FUNCTIONS[@]}"; do
        echo "  - $func"
    done
    echo ""
fi

echo "🔧 Next Steps:"
echo "----------------------------------------"
echo "1. Verify environment variables in Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/YOUR_PROJECT/settings/functions"
echo ""
echo "2. Required environment variables:"
echo "   - ANTHROPIC_API_KEY"
echo "   - OPENAI_API_KEY"
echo "   - ZAI_API_KEY"
echo "   - AZURE_SPEECH_KEY"
echo "   - AZURE_SPEECH_REGION"
echo "   - PAYFAST_MERCHANT_ID"
echo "   - PAYFAST_MERCHANT_KEY"
echo "   - PAYFAST_PASSPHRASE"
echo "   - SENDGRID_API_KEY"
echo "   - TWILIO_ACCOUNT_SID"
echo "   - TWILIO_AUTH_TOKEN"
echo ""
echo "3. Test critical functions:"
echo "   - ai-proxy (exam generation, chat)"
echo "   - send-push (notifications)"
echo "   - payfast-webhook (payments)"
echo ""
echo "4. Monitor function logs:"
echo "   supabase functions logs ai-proxy --tail"
echo ""

if [ $FAILED -gt 0 ]; then
    echo "⚠️  Some functions failed to deploy. Review errors above."
    exit 1
else
    echo "🎉 All edge functions deployed successfully!"
    exit 0
fi
