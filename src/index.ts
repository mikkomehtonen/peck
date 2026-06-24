#!/usr/bin/env node
import { Command } from 'commander'
import pkg from '../package.json'
import { initCommand } from './commands/init.js'
import { updateCommand } from './commands/update.js'
import { storyCommand } from './commands/story.js'
import { codeReviewCommand, acceptanceReviewCommand } from './commands/review.js'

const program = new Command()

program
  .name('peck')
  .description('Spec-driven development CLI')
  .version(pkg.version)

program.addCommand(initCommand())
program.addCommand(updateCommand())
program.addCommand(storyCommand())
program.addCommand(codeReviewCommand())
program.addCommand(acceptanceReviewCommand())

program.parse()
