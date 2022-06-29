const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require('terser-webpack-plugin');

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = (nodeEnv === 'production');
const libraryName = process.env.npm_package_name;

module.exports = {
  mode: nodeEnv,
  context: path.resolve(__dirname, 'src'),
  entry: {
    dist: './entries/dist.js'
  },
  devtool: (isProd) ? undefined : 'eval-source-map',
  output: {
    filename: `${libraryName}.js`,
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.(s[ac]ss|css)$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: ''
            }
          },
          { loader: "css-loader" },
          {
            loader: "sass-loader"
          }
        ]
      },
      {
        test: /\.svg|\.eot|\.woff2|\.woff|\.ttf$/,
        include: path.join(__dirname, 'src/fonts'),
        type: 'asset/resource'
      }
    ]
  },
  optimization: {
    minimize: isProd,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress:{
            drop_console: true,
          }
        }
      }),
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: `${libraryName}.css`
    })
  ],
  stats: {
    colors: true,
    children: true,
    errorDetails: true
  }
};
