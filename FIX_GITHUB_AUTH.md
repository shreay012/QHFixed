# Fix GitHub Authentication Issue

Your git is currently logged in as "Adfghjhk" but trying to push to "shreay012" repo.

## ✅ SOLUTION: Use Personal Access Token

### Step 1: Create Token on GitHub

```
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Fill in:
   - Token name: QuickHire Deploy
   - Expiration: 90 days
   - Scopes: Check these:
     ☑ repo (all)
     ☑ workflow
4. Click "Generate token"
5. COPY the token (you'll only see it once!)
   Example: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 2: Store Credentials in Git

```bash
# Save credentials locally (macOS Keychain)
git config --global credential.helper osxkeychain

# When git asks for password next time, use token instead
```

### Step 3: Try Pushing Again

```bash
cd "/Users/orange/Documents/QHAIMODE"
git push -u origin main --force
```

**When asked:**
```
Username: shreay012
Password: (paste your token from Step 1)
```

The token will be saved and you won't need to enter it again.

---

## 🔄 Alternative: Clear Old Credentials

If above doesn't work, clear the old login:

### macOS (Keychain)

```bash
# Open Keychain
open /Applications/Utilities/Keychain\ Access.app

# Search for "github"
# Delete any github.com entries
# Try pushing again - it will ask for credentials
```

### Or via Terminal

```bash
# Remove saved credentials
git credential-osxkeychain erase
host=github.com

# Then when you push, enter new credentials
```

---

## ✅ Final Steps

After fixing authentication:

```bash
cd "/Users/orange/Documents/QHAIMODE"

# Verify remote is correct
git remote -v

# Push your code
git push -u origin main --force

# Should now show:
# Counting objects...
# Writing objects...
# refs/heads/main:refs/heads/main [new branch]
# Branch 'main' set up to track 'origin/main'
```

Then verify on GitHub:
```
https://github.com/shreay012/QHFixed
```

Should see all your code! ✅
