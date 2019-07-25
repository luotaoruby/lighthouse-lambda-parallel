const CATEGORIES = [
  'performance',
  'pwa',
  'accessibility',
  'seo',
  'best-practices'
]

const categoriesScore = (categories, category) => {
  return categories[category]['score'] * 100
}

module.exports = function(json) {
  const {
    userAgent,
    environment,
    lighthouseVersion,
    fetchTime,
    requestedUrl,
    finalUrl,
    runWarnings,
    runtimeError,
    audits,
    configSettings,
    categories,
    categoryGroups,
    timing,
    i18n
  } = json

  const { performance, pwa, accessibility, seo } = categories
  const bestPractices = categories['best-practices']

  const performanceScore = categoriesScore(categories, 'performance')
  const pwaScore = categoriesScore(categories, 'pwa')
  const accessibilityScore = categoriesScore(categories, 'accessibility')
  const seoScore = categoriesScore(categories, 'seo')
  const bestPracticesScore = categoriesScore(categories, 'best-practices')

  return {
    score: {
      performance: performanceScore,
      pwa: pwaScore,
      accessibility: accessibilityScore,
      seo: seoScore,
      bestPractices: bestPracticesScore
    },
    meta: {
      requestedUrl: requestedUrl,
      finalUrl: finalUrl,
      fetchTime: fetchTime
    }
  }
}
