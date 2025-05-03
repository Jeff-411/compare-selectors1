/**
 * OutlookDOMDiff - Performs structural analysis of before/after HTML snapshots
 * to identify stable anchors across Outlook versions
 */
import { JSDOM } from 'jsdom'

class OutlookDOMDiff {
  /**
   * Compare two HTML snapshots and identify structural changes
   * @param {string} beforeHTML - HTML before update
   * @param {string} afterHTML - HTML after update
   * @returns {Object} Stability report with anchor recommendations
   */
  static analyzeChanges(beforeHTML, afterHTML) {
    // Parse HTML strings into DOM trees using JSDOM
    const beforeDOM = new JSDOM(beforeHTML).window.document
    const afterDOM = new JSDOM(afterHTML).window.document

    // Compare key structural elements
    return {
      stableAttributes: this.findStableAttributes(beforeDOM, afterDOM),
      changedSelectors: this.identifyChangedSelectors(beforeDOM, afterDOM),
      recommendedAnchors: this.generateAnchorRecommendations(beforeDOM, afterDOM),
    }
  }

  /**
   * Find attributes that remain consistent between DOM snapshots
   * @param {Document} beforeDOM - DOM before update
   * @param {Document} afterDOM - DOM after update
   * @returns {Object} Map of stable attributes and their reliability score
   */
  static findStableAttributes(beforeDOM, afterDOM) {
    const stableAttributes = {}
    const attributesToCheck = ['id', 'class', 'data-testid', 'role', 'aria-label', 'name']

    // Check each attribute type for stability
    attributesToCheck.forEach(attrType => {
      const beforeElements = beforeDOM.querySelectorAll(`[${attrType}]`)
      const afterElements = afterDOM.querySelectorAll(`[${attrType}]`)

      const beforeValues = new Set(Array.from(beforeElements).map(el => el.getAttribute(attrType)))
      const afterValues = new Set(Array.from(afterElements).map(el => el.getAttribute(attrType)))

      // Find intersection of attribute values
      const commonValues = [...beforeValues].filter(value => afterValues.has(value))

      // Calculate stability score (percentage of values that remained stable)
      const stabilityScore =
        beforeValues.size > 0 ? (commonValues.length / beforeValues.size) * 100 : 0

      stableAttributes[attrType] = {
        totalBefore: beforeValues.size,
        totalAfter: afterValues.size,
        commonCount: commonValues.length,
        stabilityScore: stabilityScore.toFixed(2),
        stableValues: commonValues,
      }
    })

    return stableAttributes
  }

  /**
   * Identify selectors that have changed between versions
   * @param {Document} beforeDOM - DOM before update
   * @param {Document} afterDOM - DOM after update
   * @returns {Array<Object>} Changed selectors with before/after details
   */
  static identifyChangedSelectors(beforeDOM, afterDOM) {
    const changedSelectors = []

    // Common Outlook selectors to analyze
    const selectorsToCheck = [
      '.ms-FocusZone',
      '.ms-List-cell',
      '.ms-DetailsList',
      '.owa-border-list-item',
      '[role="listitem"]',
      '[role="option"]',
    ]

    selectorsToCheck.forEach(selector => {
      try {
        // Check existence and count before/after
        const beforeCount = beforeDOM.querySelectorAll(selector).length
        const afterCount = afterDOM.querySelectorAll(selector).length

        if (beforeCount !== afterCount) {
          changedSelectors.push({
            selector,
            beforeCount,
            afterCount,
            change: beforeCount < afterCount ? 'increased' : 'decreased',
          })
        }
      } catch (error) {
        // Skip invalid selectors
      }
    })

    return changedSelectors
  }

  /**
   * Generate recommended anchors based on stability analysis
   * @param {Document} beforeDOM - DOM before update
   * @param {Document} afterDOM - DOM after update
   * @returns {Array<Object>} Recommended anchors with stability scores
   */
  static generateAnchorRecommendations(beforeDOM, afterDOM) {
    // This is a simplified implementation
    const recommendations = {}

    // Key Outlook UI elements to track
    const features = [
      { name: 'MessageList', selector: '[role="list"]', alternativeSelector: '.ms-List' },
      {
        name: 'ComposeButton',
        selector: '[aria-label*="New message"]',
        alternativeSelector: '[aria-label*="Compose"]',
      },
      { name: 'FolderTree', selector: '[role="tree"]', alternativeSelector: '.folderPaneTree' },
      {
        name: 'ReadingPane',
        selector: '[aria-label*="Reading Pane"]',
        alternativeSelector: '.readingPane',
      },
    ]

    features.forEach(feature => {
      // Check primary selector
      let primaryExists = false
      try {
        primaryExists =
          beforeDOM.querySelector(feature.selector) && afterDOM.querySelector(feature.selector)
      } catch (e) {}

      // Check alternative selector
      let alternativeExists = false
      try {
        alternativeExists =
          beforeDOM.querySelector(feature.alternativeSelector) &&
          afterDOM.querySelector(feature.alternativeSelector)
      } catch (e) {}

      // Calculate stability score
      const stabilityScore = primaryExists ? 90 : alternativeExists ? 70 : 0

      recommendations[feature.name] = {
        primarySelector: primaryExists
          ? feature.selector
          : alternativeExists
          ? feature.alternativeSelector
          : null,
        alternativeSelectors: [feature.alternativeSelector],
        stabilityScore,
        isReliable: stabilityScore > 60,
        selectorType: primaryExists ? 'primary' : alternativeExists ? 'alternative' : 'none',
      }
    })

    return recommendations
  }
}

export default OutlookDOMDiff
