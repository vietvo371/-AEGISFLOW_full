#!/usr/bin/env ruby
# Post-install script to patch xcconfig files for Xcode 16.3 compatibility
# Run: ruby post_install_patch.rb

require 'find'

xcconfigs_dir = File.join(__dir__, 'Pods', 'Target Support Files')
exit 0 unless File.directory?(xcconfigs_dir)

count = 0
Find.find(xcconfigs_dir) do |path|
  next unless path.end_with?('.xcconfig')

  content = File.read(path)
  original = content.dup

  # Replace -Werror=non-modular-include-in-framework-module with -Wno-error=...
  content.gsub!('-Werror\=non-modular-include-in-framework-module', '-Wno-error=non-modular-include-in-framework-module')

  if content != original
    File.write(path, content)
    puts "Patched: #{File.basename(path)}"
    count += 1
  end
end

puts "Done. Patched #{count} files."
