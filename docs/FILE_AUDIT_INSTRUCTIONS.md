# File Audit Process

## Overview
This document outlines the process for conducting a file audit to identify and safely remove unused files from the WotNow project. The goal is to reduce project size, improve maintenance, and eliminate technical debt.

## Files Created
1. `file_audit_report.md` - The main report with findings from the file audit
2. `scripts/quarantine-files.sh` - A script to help quarantine files before deletion

## How to Use These Files

### Review the Audit Report
1. Open `file_audit_report.md` to see the list of files classified as:
   - **Safe to delete**: Files that appear unused and are likely safe to remove
   - **Possibly unused or duplicate**: Files that need further investigation
   - **Definitely used**: Files that should be kept (not listed in the report)

### Quarantine Process
Instead of deleting files immediately, follow this safer approach:

1. Make the quarantine script executable:
   ```bash
   chmod +x scripts/quarantine-files.sh
   ```

2. Run the quarantine script:
   ```bash
   ./scripts/quarantine-files.sh
   ```

3. Validate the application still works:
   ```bash
   npm run typecheck && npm run test && npm run build
   ```

4. Test the application thoroughly to ensure no functionality is broken.

5. If everything works for 7 days, you can safely delete the quarantined files:
   ```bash
   git rm -rf .quarantine
   git commit -m "chore: remove quarantined files after validation"
   ```

### Manual Review Checklist
Before final deletion, check:

- Search for usages in IDE (global find, symbol references)
- Verify no runtime `require()` or dynamic imports load these files
- For route/page files, confirm no dynamic routing expects them
- For assets, confirm no CSS or JSX references them

## Safety First
The audit prioritizes safety:
- Nothing is deleted automatically
- Files are first quarantined for verification
- A 7-day testing period ensures no regressions

## Future Maintenance
To avoid accumulating unused files in the future:
- Delete test and debug files after they serve their purpose
- Use consistent naming conventions for temporary files
- Consider periodic file audits (e.g., quarterly)

---

This process was created on August 25, 2025. If you have any questions or need assistance, please reach out to the team.
