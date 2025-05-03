#!/usr/bin/env node

/**
 * analyze-snapshots.js
 *
 * Command-line tool to analyze differences between two Outlook HTML snapshots
 * and identify stable selectors and anchors across versions.
 */

import path from 'path'
import { fileURLToPath } from 'url'
import OutlookDOMDiff from './analyzers/dom-diff.js'
import { loadHTMLFile, saveResults, generateHTMLReport } from './utils/file-utils.js'

// Convert ES module URL to file path
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Convert absolute path to path relative to project root
 * @param {string} absolutePath - Absolute file path
 * @returns {string} Relative path from project root
 */
function toProjectPath(absolutePath) {
  return path.relative(__dirname, absolutePath).replace(/\//g, '\\')
}

/**
 * Main function to run the analysis
 */
async function main() {
  try {
    // Parse command line arguments
    const { beforePath, afterPath, outputJsonPath, outputHtmlPath } = parseArgs()

    console.log('Starting Outlook HTML snapshot differential analysis of:')
    console.log(`  - before-update file: ${toProjectPath(beforePath)}`)
    console.log(`  - after-update file: ${toProjectPath(afterPath)}`)

    // Load HTML files
    console.log('Loading HTML Snapshots...')
    const beforeHTML = await loadHTMLFile(beforePath)
    const afterHTML = await loadHTMLFile(afterPath)

    // Analyze differences
    console.log('Analyzing structural differences...')
    const results = analyzeSnapshots(beforeHTML, afterHTML)

    // Save results
    console.log('  - Analysis complete. Saving results...')
    await saveResults(results, outputJsonPath)

    // Generate HTML report
    console.log('Generating HTML report...')
    await generateHTMLReport(results, beforePath, afterPath, outputHtmlPath)

    console.log('Analysis completed successfully!')
    console.log(`  - JSON results saved to: ${toProjectPath(outputJsonPath)}`)
    console.log(`  - HTML report saved to: ${toProjectPath(outputHtmlPath)}`)
  } catch (error) {
    console.error('Error during snapshot analysis:', error)
    process.exit(1)
  }
}

/**
 * Analyze HTML snapshots using the OutlookDOMDiff class
 * @param {string} beforeHTML - HTML before update
 * @param {string} afterHTML - HTML after update
 * @returns {Object} Analysis results
 */
function analyzeSnapshots(beforeHTML, afterHTML) {
  try {
    return OutlookDOMDiff.analyzeChanges(beforeHTML, afterHTML)
  } catch (error) {
    console.error('Error analyzing snapshots:', error)
    throw error
  }
}

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2)

  // Default paths
  let beforePath = path.resolve(__dirname, 'html/inboxA.html')
  let afterPath = path.resolve(__dirname, 'html/inboxB.html')
  let outputJsonPath = path.resolve(__dirname, 'output/analysis-results.json')
  let outputHtmlPath = path.resolve(__dirname, 'output/analysis-report.html')

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--before':
        beforePath = args[++i]
        break
      case '--after':
        afterPath = args[++i]
        break
      case '--output-json':
        outputJsonPath = args[++i]
        break
      case '--output-html':
        outputHtmlPath = args[++i]
        break
      case '--help':
        showHelp()
        process.exit(0)
      default:
        // If first two arguments without flags, assume they are before and after paths
        if (i === 0 && !args[i].startsWith('--')) {
          beforePath = args[i]
        } else if (i === 1 && !args[i].startsWith('--')) {
          afterPath = args[i]
        }
    }
  }

  return {
    beforePath: path.resolve(beforePath),
    afterPath: path.resolve(afterPath),
    outputJsonPath: path.resolve(outputJsonPath),
    outputHtmlPath: path.resolve(outputHtmlPath),
  }
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Outlook HTML Snapshot Analyzer

Usage:
  analyze-snapshots [options]
  analyze-snapshots [beforeHtml] [afterHtml]

Options:
  --before <path>        Path to the 'before' HTML snapshot file
                         Default: html/inboxA.html
                         
  --after <path>         Path to the 'after' HTML snapshot file
                         Default: html/inboxB.html
                         
  --output-json <path>   Path to save the analysis results as JSON
                         Default: output/analysis-results.json
                         
  --output-html <path>   Path to save the HTML report
                         Default: output/analysis-report.html
                         
  --help                 Show this help message

Examples:
  analyze-snapshots
  analyze-snapshots --before html/v1.html --after html/v2.html
  analyze-snapshots --output-json ./my-results.json
  `)
}

// Execute main function
main().catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
