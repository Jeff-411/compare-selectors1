/**
 * OutlookDOMDiff - Browser version
 * Performs structural analysis of before/after HTML snapshots
 * to identify stable anchors across Outlook versions
 */
class OutlookDOMDiff {
  /**
   * Compare two HTML snapshots and identify structural changes
   * @param {string} beforeHTML - HTML before update
   * @param {string} afterHTML - HTML after update
   * @returns {Object} Stability report with anchor recommendations
   */
  static analyzeChanges(beforeHTML, afterHTML) {
    // Parse HTML strings into DOM trees
    const beforeDOM = new DOMParser().parseFromString(beforeHTML, 'text/html')
    const afterDOM = new DOMParser().parseFromString(afterHTML, 'text/html')

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
   * @returns {Object} List of changed selectors with before/after states
   */
  static identifyChangedSelectors(beforeDOM, afterDOM) {
    const changedSelectors = []

    // Key elements to monitor (focusing on Outlook's core UI areas)
    const criticalElements = [
      { name: 'MESSAGE_LIST', selectors: ['.ms-List', '[role="list"]', '[data-list-type]'] },
      {
        name: 'COMPOSE_BUTTON',
        selectors: ['[aria-label*="New mail"]', '[aria-label*="Compose"]'],
      },
      {
        name: 'FOLDER_TREE',
        selectors: ['[role="tree"]', '.folderPaneTree', '[aria-label*="folder pane"]'],
      },
      {
        name: 'READING_PANE',
        selectors: [
          '[aria-label*="Reading Pane"]',
          '.readingPane',
          '[data-app-section="ReadingPane"]',
        ],
      },
      { name: 'RIBBON', selectors: ['.ms-CommandBar', '[role="toolbar"]', '.commandBarWrapper'] },
    ]

    criticalElements.forEach(element => {
      const beforeResults = this._findElementMatchingSelectors(beforeDOM, element.selectors)
      const afterResults = this._findElementMatchingSelectors(afterDOM, element.selectors)

      if (
        beforeResults.selector !== afterResults.selector ||
        !beforeResults.found !== !afterResults.found
      ) {
        changedSelectors.push({
          elementName: element.name,
          before: beforeResults,
          after: afterResults,
          status: !beforeResults.found ? 'added' : !afterResults.found ? 'removed' : 'changed',
        })
      }
    })

    return changedSelectors
  }

  /**
   * Find the first element matching any of the provided selectors
   * @private
   */
  static _findElementMatchingSelectors(dom, selectors) {
    for (const selector of selectors) {
      try {
        const element = dom.querySelector(selector)
        if (element) {
          return {
            found: true,
            selector: selector,
            element: this._getElementMetadata(element),
          }
        }
      } catch (error) {
        // Invalid selector, continue to next one
      }
    }
    return { found: false }
  }

  /**
   * Extract useful metadata about an element for comparison
   * @private
   */
  static _getElementMetadata(element) {
    return {
      tagName: element.tagName,
      attributes: this._getAttributes(element),
      childrenCount: element.children.length,
      textContentLength: element.textContent.length,
      path: this._getElementPath(element),
    }
  }

  /**
   * Get all attributes of an element as an object
   * @private
   */
  static _getAttributes(element) {
    const attributes = {}
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i]
      attributes[attr.name] = attr.value
    }
    return attributes
  }

  /**
   * Get CSS path for an element
   * @private
   */
  static _getElementPath(element) {
    if (!element || element.nodeType !== 1) {
      return ''
    }

    let path = ''
    while (element && element.nodeType === 1) {
      let selector = element.nodeName.toLowerCase()

      if (element.id) {
        selector += '#' + element.id
      } else {
        let sibling = element
        let siblingIndex = 1

        while ((sibling = sibling.previousElementSibling)) {
          if (sibling.nodeName.toLowerCase() === selector) {
            siblingIndex++
          }
        }

        if (element.previousElementSibling || element.nextElementSibling) {
          selector += ':nth-of-type(' + siblingIndex + ')'
        }
      }

      path = selector + (path ? ' > ' + path : '')
      element = element.parentNode
    }

    return path
  }

  /**
   * Generate recommendations for selector anchors based on stability analysis
   * @param {Document} beforeDOM - DOM before update
   * @param {Document} afterDOM - DOM after update
   * @returns {Object} Recommended selectors with stability scores
   */
  static generateAnchorRecommendations(beforeDOM, afterDOM) {
    const recommendations = {}
    const criticalFeatures = [
      { name: 'MessageList', role: 'list', keyTerms: ['message', 'inbox', 'mail'] },
      { name: 'ComposeButton', role: 'button', keyTerms: ['compose', 'new', 'create', 'mail'] },
      { name: 'FolderPane', role: 'tree', keyTerms: ['folder', 'navigation', 'tree'] },
      { name: 'ReadingPane', role: 'region', keyTerms: ['reading', 'content', 'message'] },
      { name: 'CommandBar', role: 'toolbar', keyTerms: ['command', 'action', 'toolbar'] },
    ]

    criticalFeatures.forEach(feature => {
      // Find stable elements matching the feature description
      const candidates = this._findStableElementsMatchingFeature(
        beforeDOM,
        afterDOM,
        feature.role,
        feature.keyTerms
      )

      if (candidates.length > 0) {
        // Sort by stability score (higher is better)
        candidates.sort((a, b) => b.stabilityScore - a.stabilityScore)

        recommendations[feature.name] = {
          primarySelector: candidates[0].selector,
          alternativeSelectors: candidates.slice(1, 4).map(c => c.selector),
          stabilityScore: candidates[0].stabilityScore,
          selectorType: candidates[0].type,
          isReliable: candidates[0].stabilityScore > 85,
        }
      } else {
        recommendations[feature.name] = {
          primarySelector: null,
          alternativeSelectors: [],
          stabilityScore: 0,
          isReliable: false,
        }
      }
    })

    return recommendations
  }

  /**
   * Find elements that remained stable between versions and match a feature description
   * @private
   */
  static _findStableElementsMatchingFeature(beforeDOM, afterDOM, role, keyTerms) {
    const candidates = []

    // Strategy 1: Role-based matching
    if (role) {
      this._addCandidatesWithRole(beforeDOM, afterDOM, role, keyTerms, candidates)
    }

    // Strategy 2: ID-based matching (highest stability)
    this._addCandidatesWithAttribute(beforeDOM, afterDOM, 'id', keyTerms, candidates, 90)

    // Strategy 3: Data attribute matching
    this._addCandidatesWithAttribute(beforeDOM, afterDOM, 'data-', keyTerms, candidates, 85)

    // Strategy 4: Class-based matching (lower stability but high availability)
    this._addCandidatesWithAttribute(beforeDOM, afterDOM, 'class', keyTerms, candidates, 75)

    return candidates
  }

  /**
   * Add candidates with matching role to the candidates array
   * @private
   */
  static _addCandidatesWithRole(beforeDOM, afterDOM, role, keyTerms, candidates) {
    const beforeElements = beforeDOM.querySelectorAll(`[role="${role}"]`)
    const afterElements = afterDOM.querySelectorAll(`[role="${role}"]`)

    beforeElements.forEach(beforeEl => {
      const matchScore = this._calculateTermMatchScore(beforeEl, keyTerms)
      if (matchScore > 0) {
        // Try to find matching element in after DOM
        const matchingAfterEl = this._findMatchingElement(beforeEl, afterElements)
        if (matchingAfterEl) {
          candidates.push({
            selector: `[role="${role}"]${this._generateAdditionalSelectors(matchingAfterEl)}`,
            stabilityScore: 85 + matchScore * 5, // Max 100
            type: 'role-based',
          })
        }
      }
    })
  }

  /**
   * Add candidates with matching attribute to the candidates array
   * @private
   */
  static _addCandidatesWithAttribute(
    beforeDOM,
    afterDOM,
    attrType,
    keyTerms,
    candidates,
    baseScore
  ) {
    let selector = attrType === 'data-' ? '[data-*]' : `[${attrType}]`
    let beforeElements, afterElements

    try {
      if (attrType === 'data-') {
        // Need to handle data-* attributes specially
        beforeElements = Array.from(beforeDOM.querySelectorAll('*')).filter(el =>
          this._hasDataAttribute(el)
        )
        afterElements = Array.from(afterDOM.querySelectorAll('*')).filter(el =>
          this._hasDataAttribute(el)
        )
      } else {
        beforeElements = beforeDOM.querySelectorAll(selector)
        afterElements = afterDOM.querySelectorAll(selector)
      }

      beforeElements.forEach(beforeEl => {
        const matchScore = this._calculateTermMatchScore(beforeEl, keyTerms)
        if (matchScore > 0) {
          // Try to find matching element in after DOM
          const matchingAfterEl = this._findMatchingElement(beforeEl, afterElements)
          if (matchingAfterEl) {
            const attrSelector = this._getBestAttributeSelector(matchingAfterEl, attrType)
            if (attrSelector) {
              candidates.push({
                selector: attrSelector,
                stabilityScore: baseScore + matchScore * 3,
                type: `${attrType}-based`,
              })
            }
          }
        }
      })
    } catch (error) {
      // Skip invalid selectors
    }
  }

  /**
   * Check if an element has any data-* attributes
   * @private
   */
  static _hasDataAttribute(element) {
    return Array.from(element.attributes).some(attr => attr.name.startsWith('data-'))
  }

  /**
   * Calculate how well an element matches the key terms
   * @private
   */
  static _calculateTermMatchScore(element, keyTerms) {
    let score = 0
    const elementText = (element.textContent || '').toLowerCase()
    const attributes = this._getAttributes(element)

    // Check element text content
    keyTerms.forEach(term => {
      if (elementText.includes(term.toLowerCase())) {
        score += 1
      }
    })

    // Check attributes for key terms
    Object.values(attributes).forEach(attrValue => {
      keyTerms.forEach(term => {
        if (attrValue.toLowerCase().includes(term.toLowerCase())) {
          score += 2 // Attribute matches are weighted higher
        }
      })
    })

    // Normalize score to 0-5 range
    return Math.min(5, score)
  }

  /**
   * Find matching element in the after DOM based on similarity
   * @private
   */
  static _findMatchingElement(beforeEl, afterElements) {
    const beforeAttrs = this._getAttributes(beforeEl)
    let bestMatch = null
    let highestScore = 0

    afterElements.forEach(afterEl => {
      const afterAttrs = this._getAttributes(afterEl)
      let matchScore = 0

      // Score based on matching attributes
      Object.keys(beforeAttrs).forEach(attrName => {
        if (afterAttrs[attrName] === beforeAttrs[attrName]) {
          matchScore += 2
        } else if (
          afterAttrs[attrName] &&
          beforeAttrs[attrName] &&
          afterAttrs[attrName].includes(beforeAttrs[attrName])
        ) {
          matchScore += 1
        }
      })

      // Score based on structure similarity
      if (beforeEl.tagName === afterEl.tagName) {
        matchScore += 1
      }

      // Score based on position in DOM
      if (this._getRelativePosition(beforeEl) === this._getRelativePosition(afterEl)) {
        matchScore += 2
      }

      if (matchScore > highestScore) {
        highestScore = matchScore
        bestMatch = afterEl
      }
    })

    return bestMatch
  }

  /**
   * Get relative position index among siblings
   * @private
   */
  static _getRelativePosition(element) {
    let position = 0
    let sibling = element
    while ((sibling = sibling.previousElementSibling)) {
      position++
    }
    return position
  }

  /**
   * Generate the best attribute-based selector for an element
   * @private
   */
  static _getBestAttributeSelector(element, attrType) {
    if (attrType === 'id' && element.id) {
      return `#${element.id}`
    }

    if (attrType === 'class' && element.className) {
      const classes = element.className.split(' ').filter(c => c)
      if (classes.length > 0) {
        // Use the most specific (longest) class for better targeting
        const sortedClasses = [...classes].sort((a, b) => b.length - a.length)
        return `.${sortedClasses[0]}`
      }
    }

    if (attrType === 'data-') {
      const dataAttrs = Array.from(element.attributes).filter(attr => attr.name.startsWith('data-'))

      if (dataAttrs.length > 0) {
        const attr = dataAttrs[0]
        return `[${attr.name}="${attr.value}"]`
      }
    }

    // Fallback: use the attribute itself
    const attrs = this._getAttributes(element)
    const keys = Object.keys(attrs)
    if (keys.includes(attrType)) {
      return `[${attrType}="${attrs[attrType]}"]`
    }

    return null
  }

  /**
   * Generate additional selectors to improve specificity
   * @private
   */
  static _generateAdditionalSelectors(element) {
    const additionalSelectors = []

    // Add tag name for specificity
    additionalSelectors.push(element.tagName.toLowerCase())

    // Add a class if present (but not too many)
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c)
      if (classes.length > 0) {
        // Just use first class to keep selector clean
        additionalSelectors.push(`.${classes[0]}`)
      }
    }

    // Check for specific position if needed
    if (element.parentElement && element.parentElement.children.length > 1) {
      const siblings = element.parentElement.children
      const sameTagSiblings = Array.from(siblings).filter(el => el.tagName === element.tagName)

      if (sameTagSiblings.length > 1) {
        const position = Array.from(siblings).indexOf(element) + 1
        additionalSelectors.push(`:nth-child(${position})`)
      }
    }

    // Combine into a compound selector if we have additions
    return additionalSelectors.length > 0 ? additionalSelectors.join('') : ''
  }
}

// Make available globally if in browser context
if (typeof window !== 'undefined') {
  window.OutlookDOMDiff = OutlookDOMDiff
}
