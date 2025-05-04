/**
 * File utilities for the Outlook HTML snapshot analysis
 */
import fs from 'fs/promises'
import { JSDOM } from 'jsdom'
import path from 'path'
import { fileURLToPath } from 'url'

// Convert ES module URL to file path
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Convert absolute path to path relative to project root
 * @param {string} absolutePath - Absolute file path
 * @returns {string} Relative path from project root
 */
function toProjectPath(absolutePath) {
  return path.relative(path.resolve(__dirname, '..'), absolutePath).replace(/\//g, '\\')
}

/**
 * Load HTML file and return its contents
 * @param {string} filePath - Path to HTML file
 * @returns {Promise<string>} HTML content as string
 */
export async function loadHTMLFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (error) {
    console.error(`Error loading HTML file ${toProjectPath(filePath)}:`, error)
    throw error
  }
}

/**
 * Parse HTML string into a DOM document
 * @param {string} html - HTML content
 * @returns {Document} DOM document
 */
export function parseHTML(html) {
  const dom = new JSDOM(html)
  return dom.window.document
}

/**
 * Save analysis results to a JSON file
 * @param {Object} results - Analysis results
 * @param {string} outputPath - Path to save the results
 * @returns {Promise<void>}
 */
export async function saveResults(results, outputPath) {
  try {
    const outputDir = path.dirname(outputPath)

    // Ensure output directory exists
    try {
      await fs.mkdir(outputDir, { recursive: true })
    } catch (err) {
      // Directory might already exist, ignore error
    }

    await fs.writeFile(outputPath, JSON.stringify(results, null, 2), 'utf8')

    console.log(`  - Results saved to ${toProjectPath(outputPath)}`)
  } catch (error) {
    console.error('Error saving results:', error)
    throw error
  }
}

/**
 * Create an HTML report from analysis results
 * @param {Object} results - Analysis results
 * @param {string} beforePath - Path to before HTML file
 * @param {string} afterPath - Path to after HTML file
 * @param {string} outputPath - Path to save the HTML report
 * @returns {Promise<void>}
 */
export async function generateHTMLReport(results, beforePath, afterPath, outputPath) {
  const beforePathShort = path.basename(beforePath)
  const afterPathShort = path.basename(afterPath)

  const report = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Outlook HTML Snapshot Comparison</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #0078d4; }
    .report-section { margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .score-high { color: #107c10; }
    .score-medium { color: #ff8c00; }
    .score-low { color: #d83b01; }
    .status-changed { color: #0078d4; font-weight: bold; }
    .status-added { color: #107c10; font-weight: bold; }
    .status-removed { color: #d83b01; font-weight: bold; }
    pre { background: #f6f8fa; border-radius: 3px; padding: 10px; overflow: auto; }
    .highlight { background-color: #fff3cd; padding: 2px; }
  </style>
</head>
<body>
  <h1>Outlook HTML Snapshot Comparison</h1>
  <div class="report-meta">
    <p><strong>Before:</strong> ${beforePathShort}</p>
    <p><strong>After:</strong> ${afterPathShort}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>

  <div class="report-section">
    <h2>Stable Attributes Analysis</h2>
    <table>
      <tr>
        <th>Attribute Type</th>
        <th>Before Count</th>
        <th>After Count</th>
        <th>Common Count</th>
        <th>Stability Score</th>
      </tr>
      ${Object.entries(results.stableAttributes)
        .map(
          ([attr, data]) => `
        <tr>
          <td>${attr}</td>
          <td>${data.totalBefore}</td>
          <td>${data.totalAfter}</td>
          <td>${data.commonCount}</td>
          <td class="${getScoreClass(data.stabilityScore)}">${data.stabilityScore}%</td>
        </tr>
      `
        )
        .join('')}
    </table>

    <h3>Most Stable Values</h3>
    ${Object.entries(results.stableAttributes)
      .map(
        ([attr, data]) => `
      <div>
        <h4>${attr} (top 10)</h4>
        <pre>${JSON.stringify((data.stableValues || []).slice(0, 10), null, 2)}</pre>
      </div>
    `
      )
      .join('')}
  </div>

  <div class="report-section">
    <h2>Changed Selectors</h2>
    <table>
      <tr>
        <th>Element</th>
        <th>Status</th>
        <th>Before</th>
        <th>After</th>
      </tr>
      ${results.changedSelectors
        .map(change => {
          // Handle both formats (browser and Node.js versions)
          if (change.before && change.after) {
            // Browser format
            return `
            <tr>
              <td>${change.elementName || 'Element'}</td>
              <td class="status-${change.status}">${change.status}</td>
              <td>${change.before.found ? change.before.selector : 'N/A'}</td>
              <td>${change.after.found ? change.after.selector : 'N/A'}</td>
            </tr>
            `
          } else {
            // Node.js format
            return `
            <tr>
              <td>${change.selector || 'Element'}</td>
              <td class="status-${change.change}">${change.change}</td>
              <td>${change.beforeCount !== undefined ? change.beforeCount : 'N/A'}</td>
              <td>${change.afterCount !== undefined ? change.afterCount : 'N/A'}</td>
            </tr>
            `
          }
        })
        .join('')}
    </table>
  </div>

  <div class="report-section">
    <h2>Recommended Anchors</h2>
    <table>
      <tr>
        <th>Feature</th>
        <th>Primary Selector</th>
        <th>Stability Score</th>
        <th>Type</th>
        <th>Alternatives</th>
      </tr>
      ${Object.entries(results.recommendedAnchors)
        .map(
          ([feature, data]) => `
        <tr>
          <td>${feature}</td>
          <td>${data.primarySelector || 'None found'}</td>
          <td class="${getScoreClass(data.stabilityScore)}">${data.stabilityScore}</td>
          <td>${data.selectorType || 'N/A'}</td>
          <td>
            <pre>${JSON.stringify(data.alternativeSelectors || [], null, 2)}</pre>
          </td>
        </tr>
      `
        )
        .join('')}
    </table>
  </div>

  <div class="report-section">
    <h2>Summary</h2>
    <p>This analysis identified ${results.changedSelectors.length} changed selectors and 
       ${
         Object.values(results.recommendedAnchors).filter(a => a.isReliable).length
       } reliable anchor points
       between the before and after snapshots.</p>
    
    <h3>Recommendations</h3>
    <ul>
      ${Object.entries(results.recommendedAnchors)
        .filter(([_, data]) => data.isReliable)
        .map(
          ([feature, data]) => `
          <li>Use <code class="highlight">${data.primarySelector}</code> as a reliable selector for ${feature}</li>
        `
        )
        .join('')}
    </ul>
  </div>
</body>
</html>`

  try {
    const outputDir = path.dirname(outputPath)

    // Ensure output directory exists
    try {
      await fs.mkdir(outputDir, { recursive: true })
    } catch (err) {
      // Directory might already exist, ignore error
    }

    await fs.writeFile(outputPath, report, 'utf8')
    console.log(`  - HTML report saved to ${toProjectPath(outputPath)}`)
  } catch (error) {
    console.error('Error generating HTML report:', error)
    throw error
  }
}

/**
 * Helper function for HTML report to get CSS class based on score
 */
function getScoreClass(score) {
  score = parseFloat(score)
  if (score >= 80) return 'score-high'
  if (score >= 50) return 'score-medium'
  return 'score-low'
}
