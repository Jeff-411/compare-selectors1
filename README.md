# Outlook HTML Snapshot Analyzer

Tool for analyzing differences between Microsoft Outlook web interface HTML snapshots to detect UI changes and maintain compatibility with extensions.

## Overview

This tool helps developers maintain compatibility with Outlook's web interface by analyzing HTML snapshots taken before and after updates. It identifies stable selectors, detects changed UI elements, and recommends reliable anchor points that can be used in extensions or automations.

## Features

- Compare HTML snapshots to detect structural changes
- Identify stable attributes and selectors across versions
- Generate recommendations for robust selectors
- Create detailed HTML reports of analysis results
- Runs in two modes:
  - npm command line scripts
    > Recommend for quick analysis of predefined files
  - browser-based interactive diff visualization
    > More robust option for analysis of any selected files

## Installation

**Install dependencies**: `npm install`

## Usage

### Command Line

The analyzer provides three dedicated npm scripts to process each of the three main Outlook UI modes:

```bash
# Analyze inbox mode UI snapshots
npm run analyze:inbox

# Analyze reading pane mode UI snapshots
npm run analyze:read

# Analyze compose mode UI snapshots
npm run analyze:write
```

You can also run the analyzer directly with additional options:

```bash
node analyze-snapshots.js --inbox --output-json custom-results.json --output-html custom-report.html
```

**Available options:**

- `--inbox`: Compare inbox-A.html with inbox-B.html (default mode if none specified)
- `--read`: Compare read-A.html with read-B.html
- `--write`: Compare write-A.html with write-B.html
- `--output-json <path>`: Specify custom path for JSON results (default: output/analysis-results.json)
- `--output-html <path>`: Specify custom path for HTML report (default: output/analysis-report.html)

By default, the tool uses HTML snapshots from the `html/` directory and saves results to the `output/` directory.

### Browser Interface

1. Open index.html in your browser
2. Upload or paste HTML from before/after Outlook updates
3. Click "Analyze Differences"
4. View detailed analysis in the tabbed results

## Directory Structure

- analyzers: DOM diff analysis code
- browser: Web interface for interactive analysis
- docs: Documentation
- html: Example HTML snapshots for testing
  - readA.html, readB.html: Read mode UI snapshots
  - writeA.html, writeB.html: Compose mode UI snapshots
  - `inboxA.html`, `inboxB.html`: Inbox mode UI snapshots
- output: Generated reports and results
- utils: Utility functions for file handling

## Output

The analysis generates:

1. **JSON Results**: Detailed technical data including:

   - Stable attributes analysis
   - Changed selectors
   - Recommended anchors

2. **HTML Report**: Visual presentation of:
   - Stability scores for different attributes
   - Element changes between versions
   - Recommended selector strategies

## Recommendations Usage

The tool identifies elements with high stability scores across Outlook versions, helping you choose selectors that are less likely to break during updates. These can be used in your extensions or scripts:

```javascript
// Example of using recommended selectors from analysis
const composeButton = document.querySelector('[data-app-section="ComposeArea"]')
const messageList = document.querySelector('[role="complementary"][data-app-section="MessageList"]')
```

## License

MIT
