---
name: fluora-audit
description: Audit Fluora for broken demo flows, FE/BE/DB inconsistencies, unnecessary complexity, and maintainability issues before proposing fixes.
---

# Fluora Audit Workflow

1. Read `AGENTS.md`, relevant project documentation, and the current source. Establish what is implemented before assessing it.
2. Inspect and report findings first; do not begin by refactoring. Prioritize critical, high, medium, then low issues using `AGENTS.md` and its audit priorities.
3. For each finding, report:

   ```text
   Severity:
   Location:
   Problem:
   Impact:
   Recommended fix:
   ```

4. Label each finding as confirmed, probable, or an optional improvement. Do not treat style preferences as bugs or recommend production infrastructure without a real need.
5. If asked to fix findings, address critical issues first, then high issues; keep changes incremental and verify each meaningful group.
6. Update `docs/STATUS.md` only if code or actual project status changes. Report findings, changes made if requested, verification, and remaining issues.
