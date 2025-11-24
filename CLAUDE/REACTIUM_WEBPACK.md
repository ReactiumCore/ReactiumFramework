<!-- v1.0.0 -->

# ReactiumWebpack SDK

## Overview

The ReactiumWebpack SDK provides a hook-based, registry-driven approach to customizing webpack configuration in Reactium applications. It replaces the old `webpack.override.js` pattern with a more modular, plugin-friendly system that uses the Reactium Hook system and internal registries.

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js`

## Architecture

### WebpackSDK Class

The `WebpackReactiumWebpack` class (exported as `WebpackSDK`) manages webpack configuration through internal registries and hooks.

**Constructor:**

```javascript
const sdk = new WebpackSDK(name, ddd, context);
```

**Parameters:**

- `name` (string): Configuration name (e.g., 'reactium')
- `ddd` (string): DDD artifact filename to discover (e.g., 'reactium-webpack.js')
- `context` (object): Configuration context (from webpack.config.js)

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:17-86`

### Internal Registries

The SDK uses Registry instances to manage configuration components:

1. **rules** - Webpack module rules (loaders)
2. **plugins** - Webpack plugins
3. **externals** - External dependencies
4. **ignores** - Files/patterns to ignore
5. **resolveAliases** - Module resolution aliases
6. **transpiledDependencies** - node_modules to transpile

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:37-65`

Each registry:

- Uses `Registry.MODES.CLEAN` (no duplicates by ID)
- Has a reference back to the SDK via `.sdk` property
- Supports registration, unregistration, and listing

## Core Methods

### addRule(id, rule, order?)

Add a webpack module rule (loader configuration).

**Parameters:**

- `id` (string): Unique identifier for the rule
- `rule` (object): Webpack rule object
- `order` (number, optional): Priority order (default: 100)

**Example from TypeScript support:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-core/reactium-webpack.js:11-30
sdk.addRule(
  'ts-loader',
  {
    test: [/\.tsx?$/],
    use: [
      {
        loader: 'ts-loader',
        options: {
          configFile: path.resolve(__dirname, 'tsconfig.json'),
          ...tsLoaderOptionsOverrides,
        },
      },
    ],
    exclude: /node_modules/,
  },
  10
);
```

**Example from core Babel configuration:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-core/webpack.config.js:83-98
sdk.addRule('babel-loader', {
  test: [/\.jsx|js($|\?)/],
  exclude: [/node_modules/, /umd.js$/, /\.cli/],
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },
  use: [
    {
      loader: 'babel-loader',
      options: {
        cacheCompression: false,
        cacheDirectory: true,
      },
    },
  ],
});
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:148-150`

### addPlugin(id, plugin)

Add a webpack plugin instance.

**Parameters:**

- `id` (string): Unique identifier
- `plugin` (object): Webpack plugin instance

**Example from core configuration:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-core/webpack.config.js:55-60
sdk.addPlugin(
  'node-polyfills',
  new NodePolyfillPlugin({
    excludeAliases: ['console'],
  })
);

// Source: reactium_modules/@atomic-reactor/reactium-core/webpack.config.js:67
if (env === 'production') {
  sdk.addPlugin('asset-compression', new CompressionPlugin());
}
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:160-162`

### addIgnore(id, resourceRegExp, contextRegExp?)

Ignore files matching a pattern using webpack's IgnorePlugin.

**Parameters:**

- `id` (string): Unique identifier
- `resourceRegExp` (RegExp): Pattern to match resources
- `contextRegExp` (RegExp, optional): Pattern to match context

**Examples from core configuration:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-core/webpack.config.js:100-129
sdk.addIgnore('umd', /umd.js$/);
sdk.addIgnore('hbs', /\.hbs$/);
sdk.addIgnore('css', /\.css$/);
sdk.addIgnore('sass', /\.sass$/);
sdk.addIgnore('scss', /\.scss$/);
sdk.addIgnore('less', /\.less$/);
sdk.addIgnore('backup', /\.BACKUP$/);
sdk.addIgnore('png', /\.png$/);
sdk.addIgnore('jpg', /\.jpg$/);
sdk.addIgnore('gif', /\.gif$/);
sdk.addIgnore('server-src', /reactium-core[/\\]{1}server/);
sdk.addIgnore('manifest-tools', /reactium-core[/\\]{1}manifest/);
sdk.addIgnore('core-index', /reactium-core[/\\]{1}index.mjs/);
sdk.addIgnore('gulp', /reactium-core[/\\]{1}gulp/);
sdk.addIgnore('reactium-config', /reactium-core[/\\]{1}reactium-config.js$/);
sdk.addIgnore('webpack-sdk', /reactium-core[/\\]{1}webpack\.sdk/);
sdk.addIgnore('core-configs', /reactium-core[/\\]{1}.*?\.config/);
sdk.addIgnore('core-cli', /reactium-core[/\\]{1}.cli[/\\]{1}/);
sdk.addIgnore('project-cli', /\.cli/);
sdk.addIgnore('server-app', /src[/\\]{1}app[/\\]{1}server/);
sdk.addIgnore('arcli-install', /arcli-install.js$/);
sdk.addIgnore('arcli-publish', /arcli-publish.js$/);
sdk.addIgnore('reactium-boot', /reactium-boot$/);
sdk.addIgnore('reactium-gulp', /reactium-gulp$/);
sdk.addIgnore('reactium-webpack', /reactium-webpack$/);
sdk.addIgnore('parse-node', /parse[/\\]{1}node/);
sdk.addIgnore('xmlhttprequest', /xmlhttprequest/);
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:152-158`

### addResolveAlias(id, alias)

Add a module resolution alias.

**Parameters:**

- `id` (string): Import name to alias
- `alias` (string): Path to resolve to

**Example:**

```javascript
sdk.addResolveAlias('components', path.resolve('./src/app/components'));
sdk.addResolveAlias('hooks', path.resolve('./src/app/hooks'));
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:144-146`

### addExternal(id, config)

Add external dependencies (not bundled).

**Parameters:**

- `id` (string): Unique identifier
- `config` (object): External configuration
  - `key` (string | RegExp): Module name or pattern
  - `value` (string | Array | Function): External value

**Supported formats:**

1. **Regex string:** `'/react/i'` → becomes `new RegExp('react', 'i')`
2. **String keypair:** `{ key: 'react', value: 'React' }`
3. **RegExp object:** Direct RegExp instance
4. **Array value:** `{ key: 'lodash', value: ['_', 'lodash'] }`
5. **Function:** Custom external function

**Example from UMD build:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-core/umd.webpack.config.js:96-98
Object.entries(umd.externals).forEach(([key, value]) => {
  sdk.addExternal(key, { key, value });
});
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:177-196`

### addTranspiledDependency(module)

Mark a node_modules package for Babel transpilation.

**Parameters:**

- `module` (string): Package name to transpile

**Usage:**

```javascript
sdk.addTranspiledDependency('my-es6-package');
sdk.addTranspiledDependency('@scoped/package');
```

When transpiled dependencies are registered, the SDK automatically creates a Babel loader rule that excludes all of `node_modules` except the specified packages.

**Generated rule logic:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:329-350
if (this.transpiledDependencies.list.length > 0) {
  this.addRule('babel-loader', {
    test: [/\.jsx|js($|\?)/],
    exclude: [
      new RegExp(
        `node_modules\/(?!(${this.transpiledDependencies.list
          .map(({ module }) => module)
          .join('|')})\/).*`
      ),
      /umd.js$/,
    ],
    use: [
      {
        loader: 'babel-loader',
        options: {
          cacheCompression: false,
          cacheDirectory: true,
        },
      },
    ],
  });
}
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:164-166`

### addContext(id, context)

Add a webpack ContextReplacementPlugin.

**Parameters:**

- `id` (string): Unique identifier
- `context` (object):
  - `from` (RegExp): Pattern to match
  - `to` (string): Replacement path

**Example from core:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-core/webpack.config.js:61-64
sdk.addContext('reactium-modules-context', {
  from: /reactium-translations$/,
  to: path.resolve('./src/reactium-translations'),
});
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:168-175`

## Optimization Methods

### setCodeSplittingOptimize(env)

Enable aggressive code splitting for better caching and parallel loading.

**Parameters:**

- `env` (string): 'development' or 'production'

**Configuration:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:308-324
this.optimizationValue = {
  minimize: Boolean(env !== 'development'),
  chunkIds: 'named',
  splitChunks: {
    chunks: 'all',
    minSizeReduction: 500000,
    cacheGroups: {
      main: {
        minChunks: 1,
        priority: -20,
        reuseExistingChunk: true,
      },
    },
  },
};
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:308-324`

### setWebpackDefaultOptimize(env)

Use webpack's default optimization strategy.

**Parameters:**

- `env` (string): 'development' or 'production'

**Configuration:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:281-306
this.optimizationValue = {
  minimize: Boolean(env !== 'development'),
  splitChunks: {
    chunks: 'async',
    minSize: 20000,
    minRemainingSize: 0,
    minChunks: 1,
    maxAsyncRequests: 30,
    maxInitialRequests: 30,
    enforceSizeThreshold: 50000,
    cacheGroups: {
      defaultVendors: {
        test: /[\\/]node_modules[\\/]/,
        priority: -10,
        reuseExistingChunk: true,
      },
      default: {
        minChunks: 2,
        priority: -20,
        reuseExistingChunk: true,
      },
    },
  },
};
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:281-306`

### setNoCodeSplitting(env)

Disable code splitting entirely (single bundle output).

**Parameters:**

- `env` (string): 'development' or 'production'

**Example from core:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-core/webpack.config.js:50-53
sdk.setCodeSplittingOptimize(env);
if (process.env.DISABLE_CODE_SPLITTING === 'true') {
  sdk.setNoCodeSplitting();
}
```

**Implementation:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:268-279
setNoCodeSplitting(env) {
    this.optimizationValue = {
        minimize: Boolean(env !== 'development'),
    };

    this.addPlugin(
        'limit-chunks',
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1,
        }),
    );
}
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:268-279`

## Properties (Getters/Setters)

### mode

Webpack mode: 'development' | 'production' | 'none'

```javascript
sdk.mode = 'production';
console.log(sdk.mode); // 'production'
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:88-94`

### entry

Webpack entry points.

```javascript
sdk.entry = {
  main: './src/app/main.js',
  vendor: './src/app/vendor.js',
};
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:96-102`

### target

Webpack target environment.

```javascript
sdk.target = 'web'; // or 'node', 'electron-main', etc.
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:104-110`

### output

Webpack output configuration.

```javascript
sdk.output = {
  publicPath: '/assets/js/',
  path: path.resolve(rootPath, dest),
  filename: '[name].js',
  asyncChunks: true,
};
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:112-118`

### devtool

Source map generation strategy.

```javascript
if (env === 'development') {
  sdk.devtool = 'source-map';
}
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:120-126`

### optimization

Webpack optimization configuration.

```javascript
sdk.optimization = {
  minimize: true,
  splitChunks: {
    /* ... */
  },
};
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:128-134`

### overrides

Direct webpack config overrides (merged with spread operator).

```javascript
sdk.overrides = {
  resolve: {
    fallback: {
      fs: false,
      path: require.resolve('path-browserify'),
    },
  },
};
```

**Note:** Overrides are merged at the end of `config()` method, allowing you to set any webpack configuration property not exposed through the SDK API.

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:136-142, 364`

### extensions

File extensions for module resolution.

```javascript
sdk.extensions = ['.ts', '.tsx']; // Replaces default ['.js', '.jsx', '.json']
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:67, 374`

## Hook System Integration

The WebpackSDK uses the Reactium Hook system to allow plugins to modify configuration at various stages.

### Available Hooks

#### before-config

Fired before final webpack config is assembled. Receive the SDK instance.

**Signature:** `Hook.runSync('before-config', sdk)`

**Example:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-core/reactium-webpack.js:6-35
const { Hook } = require('@atomic-reactor/reactium-sdk-core/core');

Hook.registerSync(
  'before-config',
  (sdk) => {
    // Modify SDK before config generation
    sdk.addRule(
      'ts-loader',
      {
        test: [/\.tsx?$/],
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, 'tsconfig.json'),
            },
          },
        ],
        exclude: /node_modules/,
      },
      10
    );

    sdk.extensions = ['.ts', '.tsx'];
  },
  'reactium-ts-webpack'
);
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:327`

#### after-config

Fired after webpack config is assembled but before returning. Receive the final config object and SDK instance.

**Signature:** `Hook.runSync('after-config', theConfig, sdk)`

**Example:**

```javascript
Hook.registerSync(
  'after-config',
  (config, sdk) => {
    // Direct config manipulation
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: require.resolve('crypto-browserify'),
    };
  },
  'my-crypto-polyfill'
);
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:377`

#### rules

Fired when assembling module rules. Receive the rules registry.

**Signature:** `Hook.runSync('rules', sdk.rules, sdk.name, sdk.context)`

**Example:**

```javascript
Hook.registerSync(
  'rules',
  (rulesRegistry, name, context) => {
    // Modify or inspect rules
    const babelRule = rulesRegistry.get('babel-loader');
    if (babelRule) {
      // Modify babel-loader configuration
    }
  },
  'modify-babel-loader'
);
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:241-246`

#### plugins

Fired when assembling webpack plugins. Receive the plugins registry.

**Signature:** `Hook.runSync('plugins', sdk.plugins, sdk.name, sdk.context)`

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:251-256`

#### externals

Fired when assembling externals. Receive the externals registry.

**Signature:** `Hook.runSync('externals', sdk.externals, sdk.name, sdk.context)`

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:222-227`

#### ignores

Fired when assembling ignore patterns. Receive the ignores registry.

**Signature:** `Hook.runSync('ignores', sdk.ignores, sdk.name, sdk.context)`

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:199-204`

## DDD Discovery Pattern

### reactium-webpack.js

The WebpackSDK constructor automatically discovers and loads `reactium-webpack.js` files using globby:

**Discovery paths:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:74-83
globby
  .sync([`./src/**/${ddd}`, `./reactium_modules/**/${ddd}`])
  .forEach((file) => {
    try {
      require(path.resolve(file));
    } catch (error) {
      console.error(chalk.red(`Error loading ${file}:`));
      console.error(error);
    }
  });
```

**Typical structure:**

```
project/
├── src/
│   └── my-feature/
│       └── reactium-webpack.js
└── reactium_modules/
    └── @vendor/plugin/
        └── reactium-webpack.js
```

Each `reactium-webpack.js` file should register hooks to modify webpack configuration.

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js:74-85`

## Migration from webpack.override.js

### Old Pattern (webpack.override.js)

**File:** `webpack.override.example.js`

```javascript
// Source: example-reactium-project/webpack.override.example.js:1-30
const webpack = require('webpack');
const path = require('path');

/**
 * Passed the current webpack configuration from core
 * @param  {Object} webpackConfig the reactium-core webpack configuration
 * @return {Object} your webpack configuration override
 */
module.exports = (webpackConfig) => {
  const newWebpackConfig = Object.assign({}, webpackConfig);

  /**
   * @example
   *
   * newWebpackConfig.entries['entry'] = path.resolve('/path/to/my/entry');
   */

  /**
   * @example
   * newWebpackConfig.plugins.push(new webpack.ContextReplacementPlugin(/^my-context/, context => {
   *     context.request = path.resolve('./src/app/my-context');
   * }));
   */

  return newWebpackConfig;
};
```

### New Pattern (reactium-webpack.js)

**File:** `reactium-webpack.js`

```javascript
const { Hook } = require('@atomic-reactor/reactium-sdk-core/core');
const webpack = require('webpack');
const path = require('path');

Hook.registerSync(
  'before-config',
  (sdk) => {
    // Add custom entry (via sdk properties)
    sdk.entry = {
      ...sdk.entry,
      myEntry: path.resolve('/path/to/my/entry'),
    };

    // Add context replacement
    sdk.addContext('my-context', {
      from: /^my-context/,
      to: path.resolve('./src/app/my-context'),
    });
  },
  'my-webpack-customizations'
);
```

### Migration Strategy

1. **Identify customizations** in `webpack.override.js`:

   - Loaders → Use `sdk.addRule()`
   - Plugins → Use `sdk.addPlugin()`
   - Externals → Use `sdk.addExternal()`
   - Resolve aliases → Use `sdk.addResolveAlias()`
   - Output/entry/mode → Use SDK properties

2. **Create reactium-webpack.js** in appropriate location:

   - Project-level: `./reactium-webpack.js`
   - Feature-level: `./src/my-feature/reactium-webpack.js`
   - Plugin-level: `./reactium_modules/@vendor/plugin/reactium-webpack.js`

3. **Use before-config hook** for SDK-based changes:

   ```javascript
   Hook.registerSync(
     'before-config',
     (sdk) => {
       // SDK method calls
     },
     'my-plugin-id'
   );
   ```

4. **Use after-config hook** for direct config manipulation:

   ```javascript
   Hook.registerSync(
     'after-config',
     (config, sdk) => {
       // Direct config object changes
     },
     'my-plugin-id'
   );
   ```

5. **Remove webpack.override.js** when migration is complete.

### Comparison Example: Adding SVG Loader

**Old pattern:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-svg/webpack.override.js:1-10
module.exports = (config) => {
  const newWebpackConfig = Object.assign({}, config);

  newWebpackConfig.module.rules.push({
    test: /\.svg$/i,
    use: ['@svgr/webpack'],
  });

  return newWebpackConfig;
};
```

**New pattern:**

```javascript
const { Hook } = require('@atomic-reactor/reactium-sdk-core/core');

Hook.registerSync(
  'before-config',
  (sdk) => {
    sdk.addRule('svg-loader', {
      test: /\.svg$/i,
      use: ['@svgr/webpack'],
    });
  },
  'reactium-svg'
);
```

**Benefits of new pattern:**

1. Uses unique IDs (can be unregistered/replaced)
2. Priority ordering support
3. No need to clone/return config
4. Hook system allows multiple plugins to coexist
5. Registry system prevents duplicate rules

## Webpack Override Discovery (Backward Compatibility)

While `reactium-webpack.js` is the new pattern, the framework still supports `webpack.override.js` for backward compatibility.

**Discovery pattern:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-core/webpack.config.js:13-29
const overrides = (config) => {
  globby
    .sync([
      './webpack.override.js',
      './src/**/webpack.override.js',
      './reactium_modules/**/webpack.override.js',
    ])
    .forEach((file) => {
      try {
        config = require(path.resolve(file))(config);
      } catch (error) {
        console.error(chalk.red(`Error loading ${file}:`));
        console.error(error);
      }
    });
  return config;
};
```

**Usage in webpack.config.js:**

```javascript
// Source: reactium_modules/@atomic-reactor/reactium-core/webpack.config.js:131
return overrides(sdk.config());
```

Override files are applied **after** the SDK generates the config and **after** the `after-config` hook runs.

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.config.js:13-29, 131`

## Real-World Examples from Core Plugins

### Example 1: TypeScript Support

**File:** `reactium_modules/@atomic-reactor/reactium-core/reactium-webpack.js`

```javascript
const path = require('path');
const { Hook } = require('@atomic-reactor/reactium-sdk-core/core');

const tsLoaderOptionsOverrides = {};

Hook.registerSync(
  'before-config',
  (sdk) => {
    Hook.runSync('ts-loader-options', tsLoaderOptionsOverrides);

    sdk.addRule(
      'ts-loader',
      {
        test: [/\.tsx?$/],
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, 'tsconfig.json'),
              ...tsLoaderOptionsOverrides,
            },
          },
        ],
        exclude: /node_modules/,
      },
      10
    );

    sdk.extensions = ['.ts', '.tsx'];
  },
  'reactium-ts-webpack'
);
```

**Key patterns:**

- Creates an options object that other hooks can modify (`tsLoaderOptionsOverrides`)
- Runs a sub-hook (`ts-loader-options`) for extensibility
- Sets rule priority to `10` (higher priority than default)
- Modifies `sdk.extensions` to add `.ts` and `.tsx`

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/reactium-webpack.js`

### Example 2: Core Webpack Configuration

**File:** `reactium_modules/@atomic-reactor/reactium-core/webpack.config.js`

```javascript
const sdk = new WebpackSDK('reactium', 'reactium-webpack.js', config);

sdk.mode = env;
sdk.entry = config.entries;
sdk.target = 'web';
sdk.output = {
  publicPath: '/assets/js/',
  path: path.resolve(rootPath, dest),
  filename: '[name].js',
  asyncChunks: true,
};

if (env === 'development') {
  sdk.devtool = 'source-map';
}

sdk.setCodeSplittingOptimize(env);
if (process.env.DISABLE_CODE_SPLITTING === 'true') {
  sdk.setNoCodeSplitting();
}

sdk.addPlugin(
  'node-polyfills',
  new NodePolyfillPlugin({
    excludeAliases: ['console'],
  })
);

sdk.addContext('reactium-modules-context', {
  from: /reactium-translations$/,
  to: path.resolve('./src/reactium-translations'),
});

if (env === 'production') {
  sdk.addPlugin('asset-compression', new CompressionPlugin());
}

sdk.addRule('po-loader', {
  test: [/\.pot?$/],
  use: [
    {
      loader: '@atomic-reactor/webpack-po-loader',
      options: {
        format: 'jed1.x',
        domain: 'messages',
      },
    },
  ],
});

sdk.addRule('babel-loader', {
  test: [/\.jsx|js($|\?)/],
  exclude: [/node_modules/, /umd.js$/, /\.cli/],
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },
  use: [
    {
      loader: 'babel-loader',
      options: {
        cacheCompression: false,
        cacheDirectory: true,
      },
    },
  ],
});

// Multiple addIgnore calls for various file types and paths
sdk.addIgnore('umd', /umd.js$/);
sdk.addIgnore('server-src', /reactium-core[/\\]{1}server/);
// ... many more

return overrides(sdk.config());
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.config.js:31-131`

### Example 3: UMD Build Configuration

**File:** `reactium_modules/@atomic-reactor/reactium-core/umd.webpack.config.js`

```javascript
const sdk = new WebpackSDK(umd.libraryName, 'reactium-webpack.js', umd);

// Add ignores
sdk.addIgnore('hbs', /\.hbs$/);
// ... more ignores

const defines = op.get(umd, 'staticDefines', {});

if (op.get(umd, 'babelLoader', true)) {
  sdk.addRule('babel-loader', {
    test: /(\.jsx|\.js)$/,
    loader: 'babel-loader',
    options: {
      presets,
      plugins: [
        ['@babel/plugin-proposal-class-properties', { loose: true }],
        ['module-resolver'],
      ],
    },
  });
}

Object.entries(umd.externals).forEach(([key, value]) => {
  sdk.addExternal(key, { key, value });
});

if (op.get(umd, 'addDefines', true)) {
  sdk.addPlugin('defines', new webpack.DefinePlugin(defines));
}

sdk.mode = env;
sdk.entry = umd.entry;
sdk.output = {
  path: umd.outputPath,
  filename: umd.outputFile,
  library: umd.libraryName,
  libraryTarget: 'umd',
  globalObject: umd.globalObject,
};

if (env === 'production') {
  sdk.addPlugin('compression', new CompressionPlugin());
} else if (op.get(umd, 'sourcemaps', true)) {
  sdk.devtool = 'cheap-source-map';
}

return overrides(umd, sdk.config());
```

**Key patterns:**

- Configuration driven by UMD config object
- Conditional plugin/rule registration
- External dependency handling
- UMD-specific output configuration

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/umd.webpack.config.js:28-121`

### Example 4: SVG Loader (webpack.override.js pattern)

**File:** `reactium_modules/@atomic-reactor/reactium-svg/webpack.override.js`

```javascript
module.exports = (config) => {
  const newWebpackConfig = Object.assign({}, config);

  newWebpackConfig.module.rules.push({
    test: /\.svg$/i,
    use: ['@svgr/webpack'],
  });

  return newWebpackConfig;
};
```

**Note:** This is the **old pattern**. It works but should be migrated to:

```javascript
const { Hook } = require('@atomic-reactor/reactium-sdk-core/core');

Hook.registerSync(
  'before-config',
  (sdk) => {
    sdk.addRule('svg-loader', {
      test: /\.svg$/i,
      use: ['@svgr/webpack'],
    });
  },
  'reactium-svg'
);
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-svg/webpack.override.js`

## Common Webpack Customizations

### Adding a Custom Loader

```javascript
Hook.registerSync(
  'before-config',
  (sdk) => {
    sdk.addRule('sass-loader', {
      test: /\.scss$/,
      use: [
        'style-loader',
        'css-loader',
        {
          loader: 'sass-loader',
          options: {
            implementation: require('sass'),
          },
        },
      ],
    });
  },
  'my-sass-loader'
);
```

### Adding Multiple Loaders with Priority

```javascript
Hook.registerSync(
  'before-config',
  (sdk) => {
    // High priority (runs first)
    sdk.addRule(
      'eslint-loader',
      {
        test: /\.js$/,
        enforce: 'pre',
        loader: 'eslint-loader',
      },
      1
    );

    // Normal priority
    sdk.addRule(
      'my-loader',
      {
        test: /\.custom$/,
        loader: 'my-loader',
      },
      100
    );

    // Low priority (runs last)
    sdk.addRule(
      'post-loader',
      {
        test: /\.js$/,
        enforce: 'post',
        loader: 'post-loader',
      },
      1000
    );
  },
  'my-loaders'
);
```

### Environment-Specific Plugins

```javascript
Hook.registerSync(
  'before-config',
  (sdk) => {
    const env = sdk.mode;

    if (env === 'production') {
      sdk.addPlugin(
        'bundle-analyzer',
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      );
    }

    if (env === 'development') {
      sdk.addPlugin('friendly-errors', new FriendlyErrorsPlugin());
    }
  },
  'my-env-plugins'
);
```

### Adding Resolve Aliases

```javascript
Hook.registerSync(
  'before-config',
  (sdk) => {
    sdk.addResolveAlias('components', path.resolve('./src/app/components'));
    sdk.addResolveAlias('hooks', path.resolve('./src/app/hooks'));
    sdk.addResolveAlias('api', path.resolve('./src/app/api'));
    sdk.addResolveAlias('@', path.resolve('./src'));
  },
  'my-aliases'
);
```

### Marking Externals

```javascript
Hook.registerSync(
  'before-config',
  (sdk) => {
    // CDN-loaded libraries
    sdk.addExternal('react', { key: 'react', value: 'React' });
    sdk.addExternal('react-dom', { key: 'react-dom', value: 'ReactDOM' });

    // Regex pattern
    sdk.addExternal('jquery', { key: '/^jquery$/i', value: 'jQuery' });
  },
  'my-externals'
);
```

### Custom Optimization

```javascript
Hook.registerSync(
  'after-config',
  (config, sdk) => {
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      runtimeChunk: 'single',
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    };
  },
  'my-optimization'
);
```

### Polyfills and Fallbacks

```javascript
Hook.registerSync(
  'after-config',
  (config, sdk) => {
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve.fallback,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
      },
    };

    sdk.addPlugin(
      'buffer-plugin',
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      })
    );
  },
  'my-polyfills'
);
```

### Transpiling node_modules

```javascript
Hook.registerSync(
  'before-config',
  (sdk) => {
    // Transpile specific ES6+ packages
    sdk.addTranspiledDependency('query-string');
    sdk.addTranspiledDependency('split-on-first');
    sdk.addTranspiledDependency('@atomic-reactor/reactium-sdk-core');
  },
  'my-transpiled-deps'
);
```

## Best Practices

### 1. Use Unique, Namespaced IDs

```javascript
// Good
sdk.addRule('my-plugin:sass-loader', {
  /* ... */
});
sdk.addPlugin('my-plugin:compression', new CompressionPlugin());

// Bad
sdk.addRule('loader', {
  /* ... */
});
sdk.addPlugin('plugin', new SomePlugin());
```

### 2. Use Hook IDs for Debugging

```javascript
Hook.registerSync(
  'before-config',
  (sdk) => {
    // ...
  },
  'my-plugin-name'
); // Always provide an ID
```

### 3. Prefer SDK Methods Over Direct Config Manipulation

```javascript
// Good
Hook.registerSync('before-config', (sdk) => {
  sdk.addRule('babel-loader', {
    /* ... */
  });
});

// Less ideal (but sometimes necessary)
Hook.registerSync('after-config', (config) => {
  config.module.rules.push({
    /* ... */
  });
});
```

### 4. Check Environment Before Adding Plugins

```javascript
Hook.registerSync(
  'before-config',
  (sdk) => {
    const env = sdk.mode;

    if (env === 'production') {
      sdk.addPlugin('compression', new CompressionPlugin());
    }
  },
  'my-plugin'
);
```

### 5. Use Priority for Load Order

```javascript
Hook.registerSync(
  'before-config',
  (sdk) => {
    // Enforce loader runs before babel
    sdk.addRule(
      'eslint-loader',
      {
        test: /\.js$/,
        enforce: 'pre',
        loader: 'eslint-loader',
      },
      1
    ); // Low order number = higher priority
  },
  'my-linter'
);
```

### 6. Provide Extension Hooks for Plugins

```javascript
const loaderOptions = {};

Hook.registerSync(
  'before-config',
  (sdk) => {
    // Allow other plugins to modify options
    Hook.runSync('my-loader-options', loaderOptions);

    sdk.addRule('my-loader', {
      test: /\.custom$/,
      use: [
        {
          loader: 'my-loader',
          options: loaderOptions,
        },
      ],
    });
  },
  'my-loader-plugin'
);
```

### 7. Handle Errors Gracefully

```javascript
Hook.registerSync(
  'before-config',
  (sdk) => {
    try {
      const config = require('./custom-config');
      sdk.addRule('my-rule', config.rule);
    } catch (error) {
      console.warn('Custom config not found, using defaults');
      sdk.addRule('my-rule', defaultRule);
    }
  },
  'my-plugin'
);
```

### 8. Document Custom Hooks

```javascript
/**
 * my-plugin provides the following hooks:
 * - my-loader-options: Modify loader options before registration
 * - my-plugin-config: Override plugin defaults
 */

// Usage in other plugins:
Hook.registerSync(
  'my-loader-options',
  (options) => {
    options.customOption = true;
  },
  'my-plugin-extension'
);
```

## Common Gotchas

### 1. Registry ID Conflicts

**Problem:** Registering the same ID twice will replace the previous entry.

```javascript
sdk.addRule('babel-loader', ruleA);
sdk.addRule('babel-loader', ruleB); // Replaces ruleA
```

**Solution:** Use unique, namespaced IDs:

```javascript
sdk.addRule('core:babel-loader', ruleA);
sdk.addRule('my-plugin:babel-loader', ruleB);
```

### 2. Hook Execution Order

**Problem:** Hooks run in registration order, not priority order.

```javascript
// These run in order they were registered, not by priority
Hook.registerSync('before-config', sdkA, 'plugin-a');
Hook.registerSync('before-config', sdkB, 'plugin-b');
```

**Solution:** Use rule/plugin `order` parameter for prioritization:

```javascript
Hook.registerSync(
  'before-config',
  (sdk) => {
    sdk.addRule('high-priority', ruleA, 1);
    sdk.addRule('low-priority', ruleB, 100);
  },
  'my-plugin'
);
```

### 3. Modifying vs Replacing Configuration

**Problem:** Setting properties directly replaces entire objects:

```javascript
sdk.entry = { main: './new.js' }; // Replaces all entries
```

**Solution:** Merge with existing values:

```javascript
sdk.entry = {
  ...sdk.entry,
  newEntry: './new.js',
};
```

### 4. Extensions Property Replacement

**Problem:** Setting `sdk.extensions` replaces the default `['.js', '.jsx', '.json']`.

```javascript
sdk.extensions = ['.ts', '.tsx']; // Loses .js, .jsx, .json
```

**Solution:** Include defaults:

```javascript
sdk.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
```

Or spread existing:

```javascript
sdk.extensions = [...sdk.extensions, '.ts', '.tsx'];
```

### 5. Transpiled Dependencies Pattern

**Problem:** Manually creating exclude patterns is error-prone.

```javascript
// Don't do this
sdk.addRule('babel-loader', {
  exclude: /node_modules\/(?!(my-pkg|other-pkg))/,
});
```

**Solution:** Use `addTranspiledDependency()`:

```javascript
sdk.addTranspiledDependency('my-pkg');
sdk.addTranspiledDependency('other-pkg');
// SDK generates correct exclude pattern automatically
```

### 6. DDD Discovery Timing

**Problem:** `reactium-webpack.js` files are loaded during SDK construction, but hooks don't run until `config()` is called.

**Implication:** You can't access the SDK instance from `reactium-webpack.js` directly, only from within hook callbacks.

```javascript
// Won't work - SDK not available yet
const sdk = global.ReactiumWebpack; // undefined

// Correct - SDK available in hook
Hook.registerSync(
  'before-config',
  (sdk) => {
    // SDK is passed as parameter
  },
  'my-plugin'
);
```

### 7. Override vs Hook Timing

**Execution order:**

1. SDK construction
2. DDD discovery (loads `reactium-webpack.js` files)
3. SDK property setters (mode, entry, output, etc.)
4. SDK method calls (addRule, addPlugin, etc.)
5. `before-config` hook
6. `config()` method (assembles webpack config)
   - Runs registry hooks (rules, plugins, externals, ignores)
7. `after-config` hook
8. `webpack.override.js` files applied
9. Final config returned

**Implication:** Changes in `after-config` can still be overridden by `webpack.override.js` files.

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.config.js:131`

### 8. Cache Persistence

**Problem:** Webpack filesystem cache can cause stale builds when webpack config changes.

**Solution:** Clear cache when making significant webpack changes:

```bash
rm -rf node_modules/.cache
```

Or disable cache during development:

```javascript
sdk.cache = false;
```

## Advanced Patterns

### Conditional Rule Registration

```javascript
Hook.registerSync(
  'before-config',
  (sdk) => {
    const isDevelopment = sdk.mode === 'development';
    const useTypeScript = fs.existsSync('./tsconfig.json');

    if (useTypeScript) {
      sdk.addRule('ts-loader', {
        test: /\.tsx?$/,
        loader: 'ts-loader',
      });
      sdk.extensions = [...sdk.extensions, '.ts', '.tsx'];
    }

    if (isDevelopment) {
      sdk.addRule(
        'eslint-loader',
        {
          test: /\.jsx?$/,
          enforce: 'pre',
          loader: 'eslint-loader',
          options: {
            emitWarning: true,
          },
        },
        1
      );
    }
  },
  'conditional-rules'
);
```

### Multi-Compiler Support

```javascript
// UMD build uses same SDK but different DDD pattern
const sdk = new WebpackSDK('my-library', 'reactium-webpack.js', umdConfig);

Hook.registerSync(
  'before-config',
  (sdk) => {
    // Check SDK name to apply library-specific config
    if (sdk.name === 'my-library') {
      sdk.output = {
        ...sdk.output,
        libraryTarget: 'umd',
        globalObject: 'this',
      };
    }
  },
  'library-config'
);
```

### Registry Inspection and Modification

```javascript
Hook.registerSync(
  'before-config',
  (sdk) => {
    // Inspect existing rules
    const rules = sdk.rules.list;
    console.log(
      'Registered rules:',
      rules.map((r) => r.id)
    );

    // Unregister a rule
    sdk.rules.unregister('unwanted-rule');

    // Replace a rule
    sdk.rules.unregister('babel-loader');
    sdk.addRule('babel-loader', myCustomBabelRule);
  },
  'rule-inspector'
);
```

### Extending Another Plugin's Configuration

```javascript
// Plugin A provides a hook
Hook.registerSync(
  'before-config',
  (sdk) => {
    const loaderOptions = { defaultOption: true };

    // Allow modification
    Hook.runSync('my-plugin:loader-options', loaderOptions);

    sdk.addRule('my-loader', {
      loader: 'my-loader',
      options: loaderOptions,
    });
  },
  'plugin-a'
);

// Plugin B extends Plugin A
Hook.registerSync(
  'my-plugin:loader-options',
  (options) => {
    options.customOption = 'value';
  },
  'plugin-b'
);
```

### Dynamic Entry Points

```javascript
Hook.registerSync(
  'before-config',
  (sdk) => {
    const entries = { ...sdk.entry };

    // Discover feature entries
    const features = globby.sync('./src/features/*/index.js');
    features.forEach((feature) => {
      const name = path.basename(path.dirname(feature));
      entries[`feature-${name}`] = feature;
    });

    sdk.entry = entries;
  },
  'dynamic-entries'
);
```

### Shared Vendor Chunks

```javascript
Hook.registerSync(
  'after-config',
  (config, sdk) => {
    config.optimization.splitChunks = {
      cacheGroups: {
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react-vendor',
          chunks: 'all',
          priority: 10,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
          priority: 5,
        },
      },
    };
  },
  'vendor-chunks'
);
```

## Summary

The ReactiumWebpack SDK provides a powerful, hook-driven approach to webpack configuration that:

1. **Replaces `webpack.override.js`** with `reactium-webpack.js` + Hook system
2. **Uses registries** for rules, plugins, externals, aliases, and ignores
3. **Supports priority ordering** for rules and plugins
4. **Integrates with DDD** for automatic discovery
5. **Provides helper methods** for common webpack patterns
6. **Allows direct config manipulation** via `after-config` hook when needed
7. **Maintains backward compatibility** with `webpack.override.js`

### Quick Reference

**Core methods:**

- `addRule(id, rule, order?)` - Add loader
- `addPlugin(id, plugin)` - Add plugin
- `addIgnore(id, pattern)` - Ignore files
- `addResolveAlias(id, alias)` - Module alias
- `addExternal(id, config)` - External dependency
- `addTranspiledDependency(module)` - Transpile node_modules
- `addContext(id, {from, to})` - Context replacement

**Optimization:**

- `setCodeSplittingOptimize(env)` - Aggressive splitting
- `setWebpackDefaultOptimize(env)` - Webpack defaults
- `setNoCodeSplitting(env)` - Single bundle

**Properties:**

- `mode`, `entry`, `target`, `output`, `devtool`, `optimization`, `extensions`, `overrides`

**Hooks:**

- `before-config` - Modify SDK before config generation
- `after-config` - Modify final config object
- `rules`, `plugins`, `externals`, `ignores` - Modify registries

**Migration path:**

1. Create `reactium-webpack.js`
2. Register `before-config` hook
3. Use SDK methods instead of direct config manipulation
4. Remove `webpack.override.js`

**Source files:**

- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.sdk.js` - SDK implementation
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.config.js` - Main webpack config
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/reactium-webpack.js` - TypeScript example
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/umd.webpack.config.js` - UMD build config
