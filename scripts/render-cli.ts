#!/usr/bin/env tsx
/**
 * RenderForge CLI — Render videos from the command line.
 *
 * Usage:
 *   npx tsx scripts/render-cli.ts --template product-launch --format story
 *   npx tsx scripts/render-cli.ts --template quote-of-day --props '{"quote":"Hello!"}' --theme dark
 *   npx tsx scripts/render-cli.ts --template stats-recap --props ./my-props.json --output ./my-video.mp4
 */

import path from 'path';
import fs from 'fs';

// Register templates (side-effect imports)
import '../src/templates/product-launch';
import '../src/templates/quote-of-day';
import '../src/templates/stats-recap';
import '../src/templates/testimonial';
import '../src/templates/announcement';

import { registry } from '../src/core/registry';
import { getTheme } from '../src/themes';
import { FORMATS, Format } from '../src/types';

interface CLIArgs {
  template: string;
  props: Record<string, any>;
  theme: string;
  format: Format;
  output: string;
  codec: 'h264' | 'vp8' | 'gif';
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<CLIArgs> = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--template':
      case '-t':
        parsed.template = args[++i];
        break;
      case '--props':
      case '-p': {
        const val = args[++i];
        if (val.startsWith('{') || val.startsWith('[')) {
          parsed.props = JSON.parse(val);
        } else if (fs.existsSync(val)) {
          parsed.props = JSON.parse(fs.readFileSync(val, 'utf-8'));
        } else {
          console.error(`Props file not found: ${val}`);
          process.exit(1);
        }
        break;
      }
      case '--theme':
        parsed.theme = args[++i];
        break;
      case '--format':
      case '-f':
        parsed.format = args[++i] as Format;
        break;
      case '--output':
      case '-o':
        parsed.output = args[++i];
        break;
      case '--codec':
        parsed.codec = args[++i] as 'h264' | 'vp8' | 'gif';
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      case '--list':
      case '-l':
        listTemplates();
        process.exit(0);
      default:
        console.warn(`Unknown argument: ${args[i]}`);
    }
  }

  if (!parsed.template) {
    console.error('Missing required --template argument.\n');
    printHelp();
    process.exit(1);
  }

  return {
    template: parsed.template,
    props: parsed.props ?? {},
    theme: parsed.theme ?? 'default',
    format: parsed.format ?? 'landscape',
    output: parsed.output ?? `./output/${parsed.template}-${parsed.format ?? 'landscape'}.mp4`,
    codec: parsed.codec ?? 'h264',
  };
}

function printHelp(): void {
  console.log(`
RenderForge CLI — Render videos from the command line

Usage:
  npx tsx scripts/render-cli.ts [options]

Options:
  --template, -t <id>      Template ID (required)
  --props, -p <json|file>  Props as JSON string or path to .json file
  --theme <id>             Theme ID (default: "default")
  --format, -f <format>    Output format: story | post | landscape (default: "landscape")
  --output, -o <path>      Output file path (default: ./output/<template>-<format>.mp4)
  --codec <codec>          Codec: h264 | vp8 | gif (default: "h264")
  --list, -l               List all available templates
  --help, -h               Show this help message

Examples:
  npx tsx scripts/render-cli.ts --template product-launch --format story
  npx tsx scripts/render-cli.ts --template quote-of-day --props '{"quote":"Hello!"}' --theme dark
  npx tsx scripts/render-cli.ts --template stats-recap --props ./stats.json --output ./recap.mp4
`);
}

function listTemplates(): void {
  const templates = registry.list();
  console.log('\n🎬 Available Templates:\n');
  for (const t of templates) {
    console.log(
      `  ${t.id.padEnd(20)} ${t.name.padEnd(25)} [${t.supportedFormats.join(', ')}]`
    );
    console.log(`  ${''.padEnd(20)} ${t.description}\n`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs();

  // Validate template
  const template = registry.get(args.template);
  if (!template) {
    console.error(
      `❌ Template "${args.template}" not found. Available: ${registry.ids().join(', ')}`
    );
    process.exit(1);
  }

  // Validate format
  if (!template.meta.supportedFormats.includes(args.format)) {
    console.error(
      `❌ Format "${args.format}" not supported by "${args.template}". Supported: ${template.meta.supportedFormats.join(', ')}`
    );
    process.exit(1);
  }

  // Validate and merge props
  const mergedProps = { ...template.defaultProps, ...args.props };
  const propsResult = template.schema.safeParse(mergedProps);
  if (!propsResult.success) {
    console.error('❌ Invalid props:');
    console.error(JSON.stringify(propsResult.error.flatten(), null, 2));
    process.exit(1);
  }

  const theme = getTheme(args.theme);
  const formatConfig = FORMATS[args.format];
  const compositionId = `${args.template}-${args.format}`;

  // Ensure output directory exists
  const outputDir = path.dirname(path.resolve(args.output));
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`
🎬 RenderForge CLI
──────────────────────────
Template:   ${template.meta.name} (${args.template})
Format:     ${formatConfig.label} (${formatConfig.width}×${formatConfig.height})
Theme:      ${theme.name} (${args.theme})
Duration:   ${template.meta.durationInFrames} frames @ ${template.meta.fps}fps
Output:     ${args.output}
Codec:      ${args.codec}
──────────────────────────
`);

  try {
    const { bundle } = await import('@remotion/bundler');
    const { renderMedia, selectComposition } = await import(
      '@remotion/renderer'
    );

    // Bundle
    console.log('📦 Bundling project...');
    const bundleLocation = await bundle({
      entryPoint: path.resolve(__dirname, '../src/index.ts'),
      onProgress: (progress: number) => {
        process.stdout.write(
          `\r   Progress: ${Math.round(progress * 100)}%`
        );
      },
    });
    console.log('\n   ✅ Bundle complete');

    // Select composition
    console.log('🎯 Selecting composition...');
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps: {
        ...propsResult.data,
        theme,
        format: args.format,
      },
    });

    // Render
    console.log('🎥 Rendering...');
    const startTime = Date.now();

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: args.codec === 'gif' ? 'gif' : args.codec === 'vp8' ? 'vp8' : 'h264',
      outputLocation: path.resolve(args.output),
      inputProps: {
        ...propsResult.data,
        theme,
        format: args.format,
      },
      onProgress: ({ progress }) => {
        process.stdout.write(
          `\r   Progress: ${Math.round(progress * 100)}%`
        );
      },
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n\n✅ Render complete in ${elapsed}s`);
    console.log(`   Output: ${path.resolve(args.output)}`);
  } catch (err) {
    console.error('\n❌ Render failed:', err);
    process.exit(1);
  }
}

main();
