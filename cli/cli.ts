#!/usr/bin/env node

import { Command } from 'commander';
import { registerCommands } from './commands/index.js';
import * as readline from 'readline';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

// ANSI escape codes for formatting
const bold = '\x1b[1m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

// Helper to format command arguments
function formatArgs(cmd: any): string {
  const args = cmd.registeredArguments || cmd._args || [];
  if (args.length === 0) return '';
  return ' ' + args.map((arg: any) => {
    const name = arg.name();
    return arg.required ? `<${name}>` : `[${name}]`;
  }).join(' ');
}

// Customize help output to show tree-like command structure
program.configureHelp({
  formatHelp: (cmd: any, helper: any) => {
    let output: string[] = [];

    // Check if detailed help is requested (--hhelp or -hh)
    const isDetailed = (program as any)._detailedHelp ||
                       process.argv.includes('--hhelp') ||
                       process.argv.includes('-hh');

    // For subcommands, always show detailed
    const isSubcommand = cmd.parent !== null;

    // Usage
    output.push(`${bold}Usage:${reset} ${helper.commandUsage(cmd)}`);
    output.push('');

    // Description
    if (cmd.description()) {
      output.push(cmd.description());
      output.push('');
    }

    // Commands - tree structure
    const commands = helper.visibleCommands(cmd);
    if (commands.length > 0) {
      output.push(`${bold}Commands:${reset}`);

      for (const subcommand of commands) {
        const name = subcommand.name();
        if (name === 'help') continue;

        const desc = subcommand.description();
        const args = formatArgs(subcommand);

        // Get nested subcommands (excluding help)
        const nestedCommands = subcommand.commands?.filter((c: any) => c.name() !== 'help') || [];

        // Check if this is a top-level category (has subcommands) or a leaf
        if (nestedCommands.length > 0) {
          // Category with subcommands
          output.push('');

          if (isDetailed || isSubcommand) {
            // Detailed view: show all subcommands
            output.push(`  ${bold}${name}${reset} ${dim}— ${desc}${reset}`);

            // Print nested subcommands
            for (const nested of nestedCommands) {
              const nestedName = nested.name();
              const nestedDesc = nested.description();
              const nestedArgs = formatArgs(nested);

              // Third level (e.g., cast random field)
              const thirdLevel = nested.commands?.filter((c: any) => c.name() !== 'help') || [];

              if (thirdLevel.length > 0) {
                // Has children - show as a group
                output.push(`    ${bold}${nestedName}${reset} ${dim}— ${nestedDesc}${reset}`);
                for (const third of thirdLevel) {
                  const thirdName = third.name();
                  const thirdDesc = third.description();
                  const thirdArgs = formatArgs(third);
                  const cmdStr = `${name} ${nestedName} ${thirdName}${thirdArgs}`;
                  output.push(`      ${cmdStr.padEnd(34)} ${dim}${thirdDesc}${reset}`);
                }
              } else {
                // Leaf command - show full command path
                const cmdStr = `${name} ${nestedName}${nestedArgs}`;
                output.push(`    ${cmdStr.padEnd(36)} ${dim}${nestedDesc}${reset}`);
              }
            }
          } else {
            // Compact view: show category with inline subcommand list
            const subNames = nestedCommands.map((c: any) => c.name()).join(', ');
            output.push(`  ${bold}${name}${reset} ${dim}— ${desc}${reset}`);
            output.push(`    ${dim}subcommands: ${subNames}${reset}`);
          }
        } else {
          // Leaf command at second level (for subcommand help views)
          output.push('');
          const cmdStr = `${name}${args}`;
          output.push(`  ${cmdStr.padEnd(36)} ${dim}${desc}${reset}`);
        }
      }
      output.push('');

      // Add hint for detailed help if in compact mode
      if (!isDetailed && !isSubcommand) {
        output.push(`${dim}Use -hh or --hhelp for detailed help with all subcommands${reset}`);
        output.push('');
      }
    }

    // Options
    const options = helper.visibleOptions(cmd);
    if (options.length > 0) {
      output.push(`${bold}Options:${reset}`);

      for (const option of options) {
        const flags = option.flags || option.long || '';
        const desc = option.description || '';
        output.push(`  ${flags.padEnd(26)} ${dim}${desc}${reset}`);
      }
      output.push('');
    }

    // Arguments (for subcommands)
    const visibleArgs = helper.visibleArguments(cmd);
    if (visibleArgs.length > 0) {
      output.push(`${bold}Arguments:${reset}`);

      for (const arg of visibleArgs) {
        const name = arg.name();
        const desc = arg.description || '';
        output.push(`  ${name.padEnd(26)} ${dim}${desc}${reset}`);
      }
      output.push('');
    }

    return output.join('\n');
  }
});

program
  .name('cazt')
  .description('cast-like CLI for Aztec')
  .version(packageJson.version)
  .option('--devnet', 'Use devnet (default)')
  .option('--testnet', 'Use testnet')
  .option('--mainnet', 'Use mainnet')
  .option('--sandbox', 'Use local sandbox (localhost:8080)')
  .option('--rpc-url <url>', 'Custom RPC url (overrides network flags)')
  .option('--json', 'Output as JSON')
  .option('-hh, --hhelp', 'Show detailed help with all subcommands')
  .showHelpAfterError();

// Register hierarchical command structure
registerCommands(program);

// Custom help handling for -hh/--hhelp
program.on('option:hhelp', () => {
  (program as any)._detailedHelp = true;
  program.help();
});

// Export program for testing
export { program };

// Only parse if this is the main module (not imported for testing)
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
                     process.argv[1]?.endsWith('cli.js') ||
                     process.argv[1]?.endsWith('cli.ts') ||
                     (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test' && !process.argv[1]?.includes('jest'));

if (isMainModule) {
  program.parse();
}
