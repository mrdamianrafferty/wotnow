# VS Code Performance Tips for WotNow Project

## Recommended VS Code Settings

We've set up some optimized settings in `.vscode/settings.json` to improve performance with this project.

## Opening the Project

For best performance, open this project using the workspace file:
- Use **File > Open Workspace from File** and select `WotNow.code-workspace`

## Extensions Management

Consider disabling extensions that aren't needed for this project:
1. Open Extensions panel (Cmd+Shift+X)
2. Click on "..." menu in the Extensions panel
3. Select "Disable All Installed Extensions" 
4. Re-enable only these essential extensions:
   - ESLint
   - Prettier
   - TypeScript and JavaScript Language Features
   - GitHub Copilot

## Memory Usage

If VS Code becomes slow:
1. Open Command Palette (Cmd+Shift+P)
2. Type and select "Developer: Open Process Explorer"
3. Monitor memory usage of the main VS Code process and extensions
4. If memory usage is high, restart VS Code

## Performance Commands

Use these custom scripts when needed:
- `npm run clean` - Clear caches and build artifacts
- `npm run typecheck` - Type-check without building
- `npm run optimize:images` - Optimize images in the project

## Excluded Directories

These directories are excluded from search to improve performance:
- `node_modules/`
- `.next/`
- `public/weather-icons/design/`

## Resetting Indexes

If search or IntelliSense becomes unreliable:
1. Command Palette → "TypeScript: Restart TS Server"
2. Command Palette → "Developer: Reload Window"
3. Command Palette → "GitHub Copilot: Reset Index"
