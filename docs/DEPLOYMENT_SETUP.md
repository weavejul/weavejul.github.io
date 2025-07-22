# 🚀 Deployment Setup - Secure AI Proxy

This guide shows how to deploy Julian's Brain AI with a **secure proxy** that keeps your API key hidden while allowing anyone to use the AI.

## 🎯 Architecture Overview

```
User Browser → Vercel Function → Google Gemini API
                 (with hidden API key)
```

- **Frontend**: Hosted on GitHub Pages (free)
- **API Proxy**: Hosted on Vercel Functions (free)
- **API Key**: Secure environment variable (hidden)

## 📋 Prerequisites

1. **GitHub repository** with your website code
2. **Google Gemini API key** (free from [aistudio.google.com/apikey](https://aistudio.google.com/apikey))
3. **Vercel account** (free at [vercel.com](https://vercel.com))

## 🔧 Step 1: Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated key (starts with `AIzaSy...`)
5. Keep this secure - you'll need it for Vercel

## 🚀 Step 2: Deploy to Vercel

### Option A: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to your project
cd path/to/your/website

# Deploy
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name? julian-website-ai
# - Directory? ./docs (or wherever your files are)
# - Override settings? No
```

### Option B: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Import your GitHub repository
4. Set **Root Directory** to `docs/`
5. Click **"Deploy"**

## 🔐 Step 3: Set Environment Variable

After deployment:

1. Go to your Vercel project dashboard
2. Click **"Settings"** tab
3. Click **"Environment Variables"**
4. Add new variable:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key (starts with `AIzaSy...`)
   - **Environments**: All (Production, Preview, Development)
5. Click **"Save"**

## 🔄 Step 4: Redeploy

After adding the environment variable:

```bash
# Redeploy to apply environment variables
vercel --prod
```

Or trigger a redeploy from the Vercel dashboard.

## ✅ Step 5: Test Your Deployment

1. Visit your Vercel URL (e.g., `https://your-project.vercel.app`)
2. Click on the brain model
3. Scroll to "Neural Interface" section
4. Click **"Activate AI"** 
5. Start chatting!

**No API key required for users!** 🎉

## 🌐 Step 6: Custom Domain (Optional)

### Connect to GitHub Pages

If you want to keep using GitHub Pages for your main site:

1. **GitHub Pages**: Serves your main website (`juliver.xyz`)
2. **Vercel**: Handles only the API (`api.juliver.xyz`)

### Setup Custom Subdomain

1. In Vercel dashboard → **"Settings"** → **"Domains"**
2. Add domain: `api.juliver.xyz` 
3. Add DNS record in your domain provider:
   ```
   Type: CNAME
   Name: api
   Value: your-project.vercel.app
   ```
4. Update your frontend code:
   ```javascript
   this.apiEndpoint = 'https://api.juliver.xyz/api/chat';
   ```

## 🔒 Security Features

- ✅ **API key hidden** from all users
- ✅ **CORS protection** configured
- ✅ **Rate limiting** via Gemini's built-in limits
- ✅ **Error handling** with user-friendly messages
- ✅ **Input validation** on all requests

## 💰 Cost Breakdown

- **Vercel Functions**: Free tier (100GB bandwidth, 100GB-hrs compute)
- **Google Gemini API**: Free tier (15 requests/min, 1M tokens/day)
- **GitHub Pages**: Free
- **Total**: **$0/month** 🎉

## 📊 Monitoring & Usage

### Vercel Analytics
- View function invocations
- Monitor response times
- Track bandwidth usage

### Gemini API Quota
- Monitor at [aistudio.google.com](https://aistudio.google.com)
- Current usage vs limits
- Upgrade if needed (still very cheap)

## 🛠️ Troubleshooting

### AI Not Responding
1. Check Vercel function logs
2. Verify `GEMINI_API_KEY` environment variable
3. Test API key at Google AI Studio
4. Check function deployment status

### CORS Errors
- Ensure `vercel.json` CORS headers are configured
- Redeploy if you made changes to CORS settings

### Rate Limits
- Gemini free tier: 15 requests/minute
- Implement client-side queuing if needed
- Consider upgrading API key for higher limits

### Function Timeout
- Vercel free tier: 10 second timeout
- Gemini usually responds in 1-3 seconds
- Check for network issues

## 🔄 Updates & Maintenance

### Updating Code
```bash
# Make changes
git add .
git commit -m "Update AI functionality"
git push

# Redeploy
vercel --prod
```

### Rotating API Keys
1. Generate new key at Google AI Studio
2. Update environment variable in Vercel
3. Redeploy project
4. Old key stops working automatically

## 🚀 Production Checklist

- [ ] Environment variable `GEMINI_API_KEY` set
- [ ] Vercel function deploys successfully  
- [ ] Test AI chat functionality
- [ ] Monitor function logs for errors
- [ ] Set up custom domain (optional)
- [ ] Configure monitoring/alerts (optional)

---

## 🎉 Success!

Your AI is now live with:
- ✅ **Zero user setup** required
- ✅ **Secure API key** hidden from public
- ✅ **Free hosting** on Vercel + GitHub Pages
- ✅ **Professional AI** powered by Google Gemini
- ✅ **Instant responses** for all visitors

Users can now chat with Julian's AI brain instantly without any configuration! 🧠🤖 