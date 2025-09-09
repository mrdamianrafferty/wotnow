# 🚀 Vercel Deployment Checklist

## Before Deploying:

### ✅ Environment Variables
- [ ] Add all required environment variables in Vercel Dashboard
- [ ] NEXT_PUBLIC_OPENWEATHER_KEY
- [ ] STORMGLASS_SECRET_KEY  
- [ ] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
- [ ] EVENTBRITE_API_KEY
- [ ] N2YO_API_KEY
- [ ] NEXT_PUBLIC_BASE_URL

### ✅ Code Quality
- [ ] All imports are resolved (no module not found errors)
- [ ] Local build passes: `npm run build`
- [ ] Tests pass: `npm test`
- [ ] No TypeScript errors: `npx tsc --noEmit`

### ✅ Configuration
- [ ] vercel.json is valid (no schema errors)
- [ ] .vercelignore excludes unnecessary files
- [ ] Build script (vercel-build.sh) is executable
- [ ] All API routes are in pages/api/ or app/api/

### ✅ Dependencies
- [ ] No missing dependencies in package.json
- [ ] No conflicting peer dependencies
- [ ] All devDependencies are properly categorized

## Deployment Steps:

1. **Connect to Vercel:**
   ```bash
   npx vercel login
   npx vercel link
   ```

2. **Deploy Preview:**
   ```bash
   npx vercel
   ```

3. **Deploy to Production:**
   ```bash
   npx vercel --prod
   ```

## Common Issues & Solutions:

### Build Fails:
- Check Vercel build logs for specific errors
- Ensure all environment variables are set
- Verify all file paths use forward slashes
- Check that all imports are case-sensitive

### Runtime Errors:
- Check Vercel function logs
- Verify API endpoints are accessible
- Ensure CORS is properly configured
- Check that all external APIs are reachable

### Performance Issues:
- Monitor bundle size in Vercel analytics
- Check for unused dependencies
- Optimize images and assets
- Review cache headers configuration

## Useful Commands:

```bash
# Local testing
npm run build && npm start

# Check bundle size
npx @next/bundle-analyzer

# View deployment logs
npx vercel logs [deployment-url]

# Environment variables
npx vercel env ls
npx vercel env add [name]
```
