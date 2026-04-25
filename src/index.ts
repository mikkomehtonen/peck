#!/usr/bin/env node
import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { storyCommand } from './commands/story.js'

const program = new Command()

program
  .name('kiss-spec')
  .description('Spec-driven development CLI')
  .version('0.1.0')

program.addCommand(initCommand())
program.addCommand(storyCommand())

program.parse()
