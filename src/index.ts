#!/usr/bin/env bun
import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { storyCommand } from './commands/story.js'
import { codeReviewCommand, acceptanceReviewCommand } from './commands/review.js'

const program = new Command()

program
  .name('kiss-spec')
  .description('Spec-driven development CLI')
  .version('0.1.0')

program.addCommand(initCommand())
program.addCommand(storyCommand())
program.addCommand(codeReviewCommand())
program.addCommand(acceptanceReviewCommand())

program.parse()
