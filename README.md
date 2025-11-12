# mAIware

## Prerequisites
- Node.js 18+
- npm

Install dependencies once:

```bash
npm install
```

## Running the scanner with the UI
Launch Electron normally so you can watch the UI states change when a download is detected:

```bash
npm start
```

1. Keep the window open.
2. Place any file in your operating system's **Downloads** folder (the app listens to the path returned by `app.getPath('downloads')`).
   - On macOS/Linux this is typically `~/Downloads`.
   - On Windows this is usually `C:\Users\<you>\Downloads`.
3. As soon as the file is fully written you should see the UI jump from the idle screen to the "Analyzing" state, then (about 10 seconds later) to the "Result" screen showing the simulated verdict.

If nothing happens, double‑check that the file really landed in the Downloads folder being monitored and that the Electron app remained open.

## Running in background/headless mode
You can start the monitor without creating any window. The worker thread keeps running and logs progress to the terminal:

```bash
npm start -- --background
```

To trigger a scan while headless, drop a file into your Downloads folder (or use a command such as `cp path/to/file ~/Downloads/`). Watch the terminal: you should see log lines like ` [Monitor] Detected new file: example.zip`, ` [Push] Starting upload...`, and eventually the simulated scan result payload.

To exit background mode press `Ctrl+C` in the terminal.

## Trying these changes locally without a pull request
You can check out the branch that contains these edits directly in your working copy:

```bash
# Make sure your workspace is clean first
git status

# Fetch the branch from the remote (replace BRANCH with the actual name)
git fetch origin BRANCH

# Create a local branch that tracks it
git checkout -b BRANCH origin/BRANCH

# Install dependencies and run the app as usual
npm install
npm start
```

When you're done evaluating the branch you can switch back to your main line of work (`git checkout main`) and delete the temporary branch with `git branch -D BRANCH` if you no longer need it.

## Applying a diff/patch locally
If someone shares a raw patch (for example via `git diff` or GitHub's "Download patch" button), you can apply it without creating a pull request:

```bash
# Save the patch file
curl -L "https://example.com/change.patch" -o change.patch

# Apply the changes to your working tree
git apply change.patch

# Review the result
git status
git diff
```

You can also pipe a patch directly into `git apply` without saving it first:

```bash
curl -L "https://example.com/change.patch" | git apply
```

After applying a patch, run the usual `npm install` (if dependencies changed) and `npm start` to test locally. To undo the patch, use `git reset --hard` (to discard all local changes) or `git checkout -- <file>` to reset individual files.
