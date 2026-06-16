#!/bin/bash
# Push script - run manually with your token
# Usage: GITHUB_TOKEN=your_token bash push_to_github.sh

REPO_DIR="/Users/hoeltzie/Documents/Apps Builder/Shipman"
GITHUB_URL="https://${GITHUB_TOKEN}@github.com/logikaistudio/shipman.git"

cd "$REPO_DIR"

# Init git if not already
if [ ! -d ".git" ]; then
  git init
  echo "Git repo initialized"
else
  echo "Git repo already exists"
fi

# Configure user
git config user.email "shipman@logikaistudio.com"
git config user.name "Logika Studio"

# Set main as default branch
git checkout -b main 2>/dev/null || git checkout main 2>/dev/null || true

# Add remote if not exists
git remote remove origin 2>/dev/null || true
git remote add origin "$GITHUB_URL"

# Stage all files
git add -A

# Commit
git commit -m "feat: premium light mode UI, superadmin login, vessel detail modal, layout overlap fix

- Light mode redesign with glassmorphism navigation
- Superadmin login bypass (user: superadmin, pass: password123)
- VesselDetailModal with daily measurement/inspection form
- Fixed ChecklistForm submit button overlap with navigation tab
- TasksScreen sidebar sticky + scrollable right pane
- Port migration from 5000 to 5005 (macOS AirPlay conflict fix)
- API relative proxy paths via Vite config" 2>&1 || echo "Nothing new to commit, trying force..."

# Push to GitHub
git push -u origin main --force 2>&1

echo "PUSH_COMPLETE"
