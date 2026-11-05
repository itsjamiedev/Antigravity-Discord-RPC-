# Automated GitHub Code Push Protocol

**Target Repository**: `https://github.com/itsjamiedev/Unstable-Wiki.git`  
**Target Branch**: `main`  
**Rule Priority**: CRITICAL / MANDATORY

---

## 1. Absolute Directive: Push on Every Single Code Change

> [!IMPORTANT]
> **WHENEVER ANY CODE CHANGE, CONFIGURATION EDIT, OR FILE CREATION/MODIFICATION IS MADE IN THIS WORKSPACE, YOU MUST AUTOMATICALLY COMMIT AND PUSH TO GITHUB (`origin main`) BEFORE CONCLUDING THE TURN.**
> 
> - Do NOT wait for the user to ask for a push.
> - Do NOT defer pushes across multiple steps or leave uncommitted modifications in the working tree.
> - Every single code modification must be accompanied by an immediate Git commit and push.

---

## 2. Push Execution Sequence

Follow this sequence for every single code change:

### Step 1: Pre-Commit Security Check
Verify that no sensitive files or environment variables are staged.
```powershell
git status
```
Ensure that no `.env`, `.env.local`, secret keys, API tokens, or credentials are staged.

### Step 2: Stage Modified Files
Stage the relevant files or the full working tree:
```powershell
git add -A
```

### Step 3: Commit with Conventional Format
Write a concise, descriptive commit message following Conventional Commits:
```powershell
git commit -m "<type>(<scope>): <summary>"
```

**Allowed Types**:
- `feat`: New feature or user-facing addition
- `fix`: Bug fix or error resolution
- `docs`: Documentation or markdown updates
- `style`: Formatting, CSS, or styling adjustments
- `refactor`: Code restructuring without functional changes
- `chore`: Configuration, agent rules, skills, tooling, or dependency updates
- `test`: Test suite additions or modifications

### Step 4: Push to Remote
Push immediately to GitHub:
```powershell
git push origin main
```

### Step 5: Verification
Ensure the command returns exit code `0`. If remote has diverged, run:
```powershell
git pull --rebase origin main
git push origin main
```

---

## 3. Pre-Push Security Checklist

Before every commit, always confirm:
- [ ] No `.env` or `.env.local` files staged
- [ ] No private keys, certificates (`*.pem`, `*.key`), or auth tokens
- [ ] No hardcoded database credentials or service-role keys
- [ ] All code modifications compile and build cleanly
