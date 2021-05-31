module.exports = {
  'env': {
    'browser': true,
    'es2021': true
  },
  'extends': [
    'airbnb-typescript/base'
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'project': './tsconfig.json'
  },
  'plugins': [
    '@typescript-eslint'
  ],
  'rules': {
    // 'indent': [
    //   'error',
    //   2
    // ],
    // 'quotes': [
    //   'error',
    //   'single'
    // ],
    // 'semi': [
    //   'error',
    //   'always'
    // ],
    // 'keyword-spacing': [
    //   'error'
    // ],
  }
};
