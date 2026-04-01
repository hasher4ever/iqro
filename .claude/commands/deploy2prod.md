Run these bash commands sequentially. No explanations, no diffs, no code review. Just execute and report pass/fail.

```
git add -A && git commit -m "auto deploy at $(TZ=Asia/Tashkent date '+%Y-%m-%d %H:%M %Z')"
git push
npm run deploy:all
```
