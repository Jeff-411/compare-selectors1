#!/usr/bin/env node

/**
 * analyze-snapshots.js
 *
 * Command-line tool to analyze differences between two Outlook HTML snapshots
 * and identify stable selectors and anchors across versions.
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { Command } from 'commander'
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
 * @param {Object} options - Command line options
 */
async function runAnalysis(options) {
  try {
    // Determine which files to analyze based on the mode
    let beforePath, afterPath

    if (options.inbox) {
      beforePath = path.resolve(__dirname, 'html/inbox-A.html')
      afterPath = path.resolve(__dirname, 'html/inbox-B.html')
    } else if (options.read) {
      beforePath = path.resolve(__dirname, 'html/read-A.html')
      afterPath = path.resolve(__dirname, 'html/read-B.html')
    } else if (options.write) {
      beforePath = path.resolve(__dirname, 'html/write-A.html')
      afterPath = path.resolve(__dirname, 'html/write-B.html')
    } else {
      // Default to inbox if no specific mode is selected
      beforePath = path.resolve(__dirname, 'html/inbox-A.html')
      afterPath = path.resolve(__dirname, 'html/inbox-B.html')
    }

    // Use custom output paths if specified
    const outputJsonPath = options.outputJson
      ? path.resolve(options.outputJson)
      : path.resolve(__dirname, 'output/analysis-results.json')

    const outputHtmlPath = options.outputHtml
      ? path.resolve(options.outputHtml)
      : path.resolve(__dirname, 'output/analysis-report.html')

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

// Set up Commander
const program = new Command()

program
  .name('analyze-snapshots')
  .description('Analyze differences between Outlook HTML snapshots')
  .version('1.0.0')
  .option('--inbox', 'Analyze inbox mode snapshots (inbox-A.html and inbox-B.html)')
  .option('--read', 'Analyze read mode snapshots (read-A.html and read-B.html)')
  .option('--write', 'Analyze compose mode snapshots (write-A.html and write-B.html)')
  .option('--output-json <path>', 'Path to save the analysis results as JSON')
  .option('--output-html <path>', 'Path to save the HTML report')
  .parse(process.argv)

const options = program.opts()

// Execute main function with parsed options
runAnalysis(options).catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
