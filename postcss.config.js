const symbols = require('./node_modules/postcss/lib/symbols');

module.exports = {
  plugins: {
    'tailwindcss': {},
    'autoprefixer': {},
    'postcss-flexbugs-fixes': {},
    'postcss-preset-env': {
      stage: 3
    }
  }
} 