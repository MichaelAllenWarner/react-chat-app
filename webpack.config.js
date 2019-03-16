const path = require('path');

module.exports = [
  {
    entry: './src/index.js',
    output: {
      filename: 'es5-main.js',
      path: path.resolve(__dirname, 'public/js')
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  useBuiltIns: 'usage',
                  debug: true,
                  targets: {
                    browsers: ['IE >= 10']
                  }
                }]
              ]
            }
          }
        }
      ]
    }
  },
  {
    entry: './src/index.js',
    output: {
      filename: 'main.js',
      path: path.resolve(__dirname, 'public/js')
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /(node_modules|bower_components)/
        }
      ]
    }
  }
];
