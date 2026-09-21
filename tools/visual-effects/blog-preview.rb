# frozen_string_literal: true

# Development-only, populated browser fixture. Nothing is written into _posts or
# _site; tmp/ is excluded from the production Jekyll build.
# Usage: ruby tools/visual-effects/blog-preview.rb [--no-js]
unknown = ARGV - ['--no-js']
abort "Usage: ruby tools/visual-effects/blog-preview.rb [--no-js]" unless unknown.empty?
without_javascript = ARGV.include?('--no-js')

# Reuse the renderer and let its integration suite verify the cached builds on
# exit. Consume the preview-only option before Minitest reads the arguments.
ARGV.clear
require_relative 'blog-build.test'

# Build both snapshots before native Sass shuts down in an at_exit hook; the
# integration tests can then read their cached results without another compiler.
BlogBuildTest.render(with_posts: false)
rendered = BlogBuildTest.render(with_posts: true)

preview_parent = File.join(BlogBuildTest::ROOT, 'tmp')
FileUtils.mkdir_p(preview_parent)
server_directory = Dir.mktmpdir('blog-preview-', preview_parent).tr('\\', '/')
site_directory = File.join(server_directory, BlogBuildTest::BASE.delete_prefix('/'))
FileUtils.mkdir_p(site_directory)

rendered.each do |relative, generated|
  target = File.expand_path(relative, site_directory)
  raise "Unexpected generated path: #{relative}" unless target.start_with?("#{site_directory}/")

  if without_javascript && File.extname(relative) == '.html'
    document = Nokogiri::HTML5(generated)
    document.css('script').remove
    generated = document.to_html
  end
  FileUtils.mkdir_p(File.dirname(target))
  File.write(target, generated, encoding: 'UTF-8')
end

# Keep the shared assets local. Homepage runtime files are included as well, so
# following a homepage link from an article does not produce missing resources.
%w[blog.js motion.js legacy-routes.js space-gateway.js space-scene.js space-scene.LICENSE.txt].each do |filename|
  original = File.join(BlogBuildTest::ROOT, 'assets', 'js', filename)
  target = File.join(site_directory, 'assets', 'js', filename)
  FileUtils.mkdir_p(File.dirname(target))
  FileUtils.cp(original, target)
end

%w[images assets/images assets/fonts files].each do |relative|
  original = File.join(BlogBuildTest::ROOT, relative)
  next unless File.directory?(original)

  target = File.join(site_directory, relative)
  FileUtils.mkdir_p(File.dirname(target))
  FileUtils.cp_r(original, target)
end

puts "Preview mode: #{without_javascript ? 'scripts removed from HTML' : 'JavaScript enabled'}"
puts "SERVER_DIRECTORY=#{server_directory}"
puts "BLOG_URL_PATH=#{BlogBuildTest::BASE}/blog/"
puts "ARTICLE_URL_PATH=#{BlogBuildTest::BASE}#{BlogBuildTest::FIRST_PATH}"
