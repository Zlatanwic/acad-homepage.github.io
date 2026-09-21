# frozen_string_literal: true

# Run from any directory with: ruby tools/visual-effects/blog-build.test.rb
# Fixtures are created only in a disposable OS temporary directory. No test post
# is ever written into the real site's _posts or _site directories.
ENV['JEKYLL_NO_BUNDLER_REQUIRE'] = 'true'

require 'fileutils'
require 'find'
require 'json'
require 'minitest/autorun'
require 'nokogiri'
require 'time'
require 'tmpdir'
require 'uri'
require 'jekyll'

class BlogBuildTest < Minitest::Test
  ROOT = File.expand_path('../..', __dir__)
  BASE = '/acad-homepage.github.io'
  ORIGIN = 'https://zlatanwic.github.io'
  FIRST_PATH = '/blog/2020/01/01/blog-fixture-first/'
  SECOND_PATH = '/blog/2020/02/02/blog-fixture-second/'
  FIRST_TITLE = 'Systems & <Notes>'
  SECOND_TITLE = '研究笔记 & 编译器'
  ARCHIVE_ROUTES = %w[/profile/ /research/ /education/ /projects/ /interests/ /blog/].freeze
  ATOM = { 'a' => 'http://www.w3.org/2005/Atom' }.freeze

  FIXTURES = {
    '2020-01-01-blog-fixture-first.md' => <<~'MARKDOWN',
      ---
      title: "Systems & <Notes>"
      description: "A fixture about parallel systems & <Notes>."
      date: 2020-01-01 12:00:00 +0800
      last_modified_at: 2020-03-01 12:00:00 +0800
      tags: ["MLSys", "C++ & CUDA"]
      lang: en
      ---

      An isolated test article, not a published personal post.

      ## Parallel systems

      A paragraph with **emphasis**, an ampersand & a [profile link]({{ '/profile/' | relative_url }}).

      See this [heading](#parallel-systems) or the [relative appendix](./appendix/).

      ### KV cache

      ```cpp
      if (left < right && ready) {
        serve();
      }
      ```

      | Strategy | Result |
      | --- | --- |
      | Pipeline | Overlap |

      - Scheduling
      - Reliability

      ![Fixture diagram]({{ '/images/kuo-li-profile.jpg' | relative_url }})
    MARKDOWN
    '2020-02-02-blog-fixture-second.md' => <<~'MARKDOWN',
      ---
      title: "研究笔记 & 编译器"
      description: "中文摘要 & <编译器>。"
      date: 2020-02-02 12:00:00 +0800
      tags: ["CUDA", "编译器"]
      lang: zh-CN
      ---

      中文内容与英文内容都应能够直接使用 Markdown 发布。

      ## 中文标题

      This second fixture checks ordering, Unicode, and article navigation.
    MARKDOWN
    '2999-01-01-blog-fixture-future.md' => <<~'MARKDOWN',
      ---
      title: "Future fixture must stay private"
      date: 2999-01-01 12:00:00 +0800
      ---
      Future fixture body must not be published.
    MARKDOWN
    '2020-03-03-blog-fixture-unpublished.md' => <<~'MARKDOWN'
      ---
      title: "Unpublished fixture must stay private"
      date: 2020-03-03 12:00:00 +0800
      published: false
      ---
      Unpublished fixture body must not be published.
    MARKDOWN
  }.freeze

  def self.render(with_posts:)
    @rendered ||= {}
    @rendered[with_posts] ||= Dir.mktmpdir('academic-blog-smoke-') do |temporary|
      # Normalize Windows separators so output keys are repository-relative and
      # identical on every platform.
      source = File.join(temporary, 'source').tr('\\', '/')
      destination = File.join(temporary, 'output').tr('\\', '/')
      FileUtils.mkdir_p(source)

      %w[_config.yml _data _includes _layouts _pages _sass _drafts assets/css].each do |relative|
        original = File.join(ROOT, relative)
        next unless File.exist?(original)

        target = File.join(source, relative)
        FileUtils.mkdir_p(File.dirname(target))
        FileUtils.cp_r(original, target)
      end

      # A normal unpublished draft also checks Jekyll's default draft exclusion,
      # independently of the publishing template's explicit published: false.
      FileUtils.mkdir_p(File.join(source, '_drafts'))
      File.write(File.join(source, '_drafts', 'blog-fixture-draft.md'), <<~MARKDOWN)
        ---
        title: "Draft fixture must stay private"
        ---
        Draft fixture body must not be published.
      MARKDOWN

      if with_posts
        FileUtils.mkdir_p(File.join(source, '_posts'))
        FIXTURES.each do |filename, contents|
          File.write(File.join(source, '_posts', filename), contents)
        end
      end

      configuration = Jekyll.configuration(
        'source' => source,
        'destination' => destination,
        'config' => File.join(source, '_config.yml'),
        'plugins' => [],
        'whitelist' => [],
        'quiet' => true,
        'disable_disk_cache' => true,
        # Silence the legacy theme's Sass migration warnings, not build errors.
        'sass' => { 'quiet_deps' => true, 'silence_deprecations' => %w[import global-builtin color-functions] }
      )
      Jekyll::Site.new(configuration).process

      Find.find(destination).select { |path| File.file?(path) }.to_h do |path|
        [path.delete_prefix("#{destination}/").tr('\\', '/'), File.read(path, encoding: 'UTF-8')]
      end
    end
  end

  def output(path, with_posts: true)
    rendered = self.class.render(with_posts: with_posts)
    assert rendered.key?(path), "Jekyll must generate #{path}; generated: #{rendered.keys.join(', ')}"
    rendered.fetch(path)
  end

  def html(path, with_posts: true)
    Nokogiri::HTML5(output(path, with_posts: with_posts))
  end

  def feed(with_posts: true)
    Nokogiri::XML(output('blog/feed.xml', with_posts: with_posts)) { |options| options.strict.nonet }
  end

  def assert_archive_navigation(document, current_path:)
    navigation = document.at_css('#site-nav')
    refute_nil navigation, 'the archive index must be usable without JavaScript'
    ARCHIVE_ROUTES.each do |route|
      assert navigation.at_css("a[href='#{BASE}#{route}']"), "archive navigation is missing #{route}"
    end
    assert document.at_css("a[href='#{BASE}/']"), 'every archive must offer a native return to the flight deck'
    current = navigation.css('a[aria-current="page"]')
    assert_equal 1, current.length, 'exactly one archive route is marked as the current page'
    assert_equal "#{BASE}#{current_path}", current.first['href']
    assert_empty navigation.css("a[href^='#']"), 'archive navigation must open independent pages, not scroll the old homepage'
  end

  def assert_reading_page_is_static(document)
    assert_empty document.css('[data-space-gateway], [data-compute-scene], [data-scene-chapter], .world-hero, canvas')
    sources = document.css('script[src]').map { |script| script['src'] }
    forbidden = %r{/(?:space-scene|space-gateway|compute-scene|homepage|motion|bits)\.js(?:\?|$)}
    refute sources.any? { |source| source.match?(forbidden) }, 'reading pages must not load flight or scrolling-animation runtimes'
    assert_empty document.css('[data-reveal], [data-bits-blur]'), 'archive content must be immediately visible without an animation controller'
  end

  def test_homepage_is_only_the_flight_deck_with_six_independent_destinations
    document = html('index.html', with_posts: false)
    assert_equal 1, document.css('[data-space-gateway]').length
    assert_equal 1, document.css('h1').length
    destinations = document.css('[data-space-destination]')
    assert_equal 6, destinations.length
    assert_equal ARCHIVE_ROUTES.map { |route| "#{BASE}#{route}" }, destinations.map { |link| link['href'] }
    assert destinations.all? { |link| link.name == 'a' && !link.text.strip.empty? }, 'planets must remain labelled native links'
    assert_empty document.css('[data-compute-scene], [data-scene-chapter], .world-hero, .paper-chapter')
    assert_empty document.css('#profile, #research-interests, #education, #research-experience, #projects, #personal-interests, #contact')
    assert document.at_css("[data-space-skip][href='#{BASE}/profile/']"), 'skipping flight opens an independent dossier'
    document.css("a[href^='#']").each do |link|
      assert document.at_css("[id='#{link['href'].delete_prefix('#')}']"), "local anchor has no target: #{link['href']}"
    end
    assert_equal "#{ORIGIN}#{BASE}/", document.at_css("link[rel='canonical']")&.[]('href')
  end

  def test_dossiers_are_independent_accessible_documents_with_native_navigation
    expected_content = {
      '/profile/' => 'From models to systems.',
      '/research/' => 'LLM Training & Inference Systems',
      '/education/' => 'Tsinghua University',
      '/projects/' => 'SemServe',
      '/interests/' => 'Manchester City'
    }
    expected_content.each do |route, content|
      document = html("#{route.delete_prefix('/')}index.html", with_posts: false)
      assert_equal 1, document.css('h1').length, "#{route} needs one document title"
      refute_empty document.at_css('h1').text.strip
      assert_equal 1, document.css('main').length
      assert_includes document.at_css('main').text, content
      assert_equal "#{ORIGIN}#{BASE}#{route}", document.at_css("link[rel='canonical']")&.[]('href')
      assert_equal "#{ORIGIN}#{BASE}#{route}", document.at_css("meta[property='og:url']")&.[]('content')
      ids = document.css('[id]').map { |element| element['id'] }
      assert_equal ids.uniq, ids, "#{route} must not duplicate IDs when sections become pages"
      assert_archive_navigation(document, current_path: route)
      assert_reading_page_is_static(document)
      assert_empty document.css('script[src]'), 'dossier navigation and content must work without an application runtime'
      document.css("a[href^='#']").each do |link|
        assert document.at_css("[id='#{link['href'].delete_prefix('#')}']"), "#{route} has a dangling local anchor: #{link['href']}"
      end
    end
  end

  def test_dossier_split_preserves_profile_research_education_projects_and_interests
    profile = html('profile/index.html', with_posts: false)
    assert profile.at_css("a[href='#{BASE}/files/Li_Kuo_CV.pdf']")
    %w[2353113@tongji.edu.cn rodebiau9320@gmail.com].each do |email|
      assert profile.at_css("a[href='mailto:#{email}']"), "contact missing: #{email}"
    end
    %w[https://madsys.cs.tsinghua.edu.cn/author/yongwei-wu/ https://madsys.cs.tsinghua.edu.cn/author/mingxing-zhang/ https://madsys.cs.tsinghua.edu.cn/].each do |url|
      assert profile.at_css("a[href='#{url}']"), "advisor or laboratory link missing: #{url}"
    end
    assert profile.at_css("img[src='#{BASE}/images/kuo-li-profile.jpg']")
    assert_match(/incoming Ph\.D\. student.*2027/m, profile.at_css('main').text)

    research = html('research/index.html', with_posts: false)
    assert_equal 4, research.css('#research-interests article').length
    ['LLM Training & Inference Systems', 'Kernel Optimization & Deep Learning Compilers', 'Efficient AI', 'Agent OS / Infrastructure'].each do |heading|
      assert_includes research.css('#research-interests h3').map(&:text), heading
    end

    education = html('education/index.html', with_posts: false)
    assert_match(/4\s*\/\s*40/, education.at_css('#education').text)
    refute_match(/\bGPA\b/i, education.at_css('main').text)
    assert education.at_css("#research-experience a[href='https://bochen.info/']")
    refute_match(/LANDS|Fusion/i, education.at_css('#research-experience').text)
    refute_match(/Honors and Awards/i, education.at_css('main').text)

    projects = html('projects/index.html', with_posts: false)
    %w[SemServe SkVM].each { |name| assert_includes projects.at_css('#projects').text, name }
    assert_includes projects.at_css('#publications').text, 'Publication updates to come.'

    interests = html('interests/index.html', with_posts: false)
    assert_equal 11, interests.css('#personal-interests img').length
    assert_equal 1, interests.css('main details.dossier-credits').length
    ['Erling Haaland', 'Kevin De Bruyne', 'Rodri', 'Grace Ashcroft', 'Arthur Morgan', 'Oasis', 'Stereophonics', 'Blur', 'Queen', "Guns N’ Roses", 'Suede'].each do |subject|
      assert interests.css('#personal-interests img').any? { |image| image['alt'].include?(subject) }, "interest photograph missing: #{subject}"
    end
  end

  def test_empty_blog_is_honest_and_drafts_are_not_published
    document = html('blog/index.html', with_posts: false)
    assert_empty document.css('[data-blog-card]')
    empty = document.at_css('.blog-empty')
    refute_nil empty, 'an empty blog needs a visible explanatory message'
    refute empty.key?('hidden')
    refute_empty empty.text.strip
    assert_empty feed(with_posts: false).xpath('/a:feed/a:entry', ATOM)
    refute self.class.render(with_posts: false).keys.any? { |path| path.include?('draft') }
  end

  def test_blog_lists_only_published_past_posts_without_requiring_javascript
    document = html('blog/index.html')
    cards = document.css('[data-blog-card]')
    assert_equal 2, cards.length
    assert_includes cards[0].text, SECOND_TITLE
    assert_includes cards[1].text, FIRST_TITLE
    assert_nil document.at_css('.blog-empty'), 'published entries replace the author-facing empty state'

    cards.each do |card|
      refute card.key?('hidden'), 'articles remain accessible before JavaScript starts'
      refute_empty card['data-search'].to_s
      assert_kind_of Array, JSON.parse(card['data-tags'])
      refute_empty JSON.parse(card['data-tags'])
    end
    assert document.at_css("[data-blog-card] a[href='#{BASE}#{FIRST_PATH}']")
    assert document.at_css("[data-blog-card] a[href='#{BASE}#{SECOND_PATH}']")
    assert_empty document.css('notes'), 'a title containing markup must be escaped'
    assert_includes cards[1]['data-search'], FIRST_TITLE

    all_output = self.class.render(with_posts: true)
    %w[future unpublished draft].each do |kind|
      refute all_output.keys.any? { |path| path.include?("blog-fixture-#{kind}") }
      refute_includes document.text, "#{kind.capitalize} fixture must stay private"
    end
  end

  def test_markdown_has_semantic_headings_code_tables_lists_and_base_path_images
    document = html("#{FIRST_PATH.delete_prefix('/')}index.html")
    article = document.at_css('#post-content')
    refute_nil article
    assert_equal 'Parallel systems', article.at_css('h2')&.text
    refute_empty article.at_css('h2')['id'].to_s
    assert_equal 'KV cache', article.at_css('h3')&.text
    assert_includes article.at_css('pre code')&.text, 'left < right && ready'
    assert_equal %w[Strategy Result], article.css('table thead th').map(&:text)
    assert_equal %w[Pipeline Overlap], article.css('table tbody td').map(&:text)
    assert_equal %w[Scheduling Reliability], article.css('ul li').map(&:text)
    assert_equal 'emphasis', article.at_css('strong')&.text
    assert_equal "#{BASE}/images/kuo-li-profile.jpg", article.at_css("img[alt='Fixture diagram']")&.[]('src')
    assert article.at_css("a[href='#{BASE}/profile/']")
    assert article.at_css("a[href='#parallel-systems']")
    assert article.at_css("a[href='./appendix/']")
    toc = document.at_css('aside[data-blog-toc]')
    refute_nil toc
    assert toc.key?('hidden'), 'the TOC remains hidden until JavaScript can populate it'
  end

  def test_nested_navigation_and_previous_next_links_keep_the_project_base_path
    [FIRST_PATH, SECOND_PATH].each do |path|
      document = html("#{path.delete_prefix('/')}index.html")
      assert document.at_css("#site-nav a[href='#{BASE}/blog/']"), 'Blog navigation must work from a dated article'
      assert_archive_navigation(document, current_path: '/blog/')
      assert_reading_page_is_static(document)
      other = path == FIRST_PATH ? SECOND_PATH : FIRST_PATH
      links = document.css('.post-pagination a').map { |link| link['href'] }
      assert_includes links, "#{BASE}#{other}"
      refute_includes links, "#{BASE}#{path}"
      refute links.any? { |link| link.include?('future') || link.include?('unpublished') }
    end

    journal = html('blog/index.html')
    assert_archive_navigation(journal, current_path: '/blog/')
    assert_reading_page_is_static(journal)
  end

  def test_metadata_is_absolute_escaped_and_specific_to_each_article
    [[FIRST_PATH, FIRST_TITLE, 'en'], [SECOND_PATH, SECOND_TITLE, 'zh-CN']].each do |path, title, language|
      document = html("#{path.delete_prefix('/')}index.html")
      assert_includes document.at_css('title')&.text, title
      assert_equal title, document.at_css("meta[property='og:title']")&.[]('content')
      assert_equal "#{ORIGIN}#{BASE}#{path}", document.at_css("link[rel='canonical']")&.[]('href')
      assert_equal "#{ORIGIN}#{BASE}#{path}", document.at_css("meta[property='og:url']")&.[]('content')
      assert_equal 'article', document.at_css("meta[property='og:type']")&.[]('content')
      assert_equal language, document.at_css('html')['lang']
      subscription = document.at_css("link[rel='alternate'][type='application/atom+xml']")
      refute_nil subscription, 'article readers can discover the Atom feed'
      assert_includes ["#{BASE}/blog/feed.xml", "#{ORIGIN}#{BASE}/blog/feed.xml"], subscription['href']
    end
  end

  def test_atom_is_valid_xml_with_stable_absolute_ids_and_escaped_article_content
    document = feed
    assert_equal 'feed', document.root.name
    assert_equal ATOM.fetch('a'), document.root.namespace.href
    assert_empty document.xpath('//html'), 'the XML feed must not inherit an HTML layout'
    assert_equal "#{ORIGIN}#{BASE}/blog/feed.xml", document.at_xpath('/a:feed/a:link[@rel="self"]', ATOM)&.[]('href')
    refute_nil Time.iso8601(document.at_xpath('/a:feed/a:updated', ATOM).text)
    entries = document.xpath('/a:feed/a:entry', ATOM)
    assert_equal 2, entries.length
    assert_equal [SECOND_TITLE, FIRST_TITLE], entries.map { |entry| entry.at_xpath('a:title', ATOM).text }
    assert_equal Time.iso8601('2020-03-01T12:00:00+08:00'), Time.iso8601(document.at_xpath('/a:feed/a:updated', ATOM).text)

    [[entries[0], SECOND_PATH], [entries[1], FIRST_PATH]].each do |entry, path|
      assert_equal "#{ORIGIN}#{BASE}#{path}", entry.at_xpath('a:id', ATOM)&.text
      assert_equal "#{ORIGIN}#{BASE}#{path}", entry.at_xpath('a:link', ATOM)&.[]('href')
      assert_equal "#{ORIGIN}#{BASE}#{path}", entry.attribute_with_ns('base', 'http://www.w3.org/XML/1998/namespace')&.value
      refute_nil Time.iso8601(entry.at_xpath('a:updated', ATOM).text)
      content = entry.at_xpath('a:content', ATOM)
      refute_nil content
      assert_equal 'html', content['type']
      assert_empty content.element_children, 'article HTML is escaped text, not arbitrary XML children'
    end
    fragment = Nokogiri::HTML5.fragment(entries[1].at_xpath('a:content', ATOM).text)
    assert_equal 'Parallel systems', fragment.at_css('h2')&.text
    assert_includes fragment.at_css('pre code')&.text, 'left < right && ready'
    entry_base = entries[1].attribute_with_ns('base', 'http://www.w3.org/XML/1998/namespace').value
    assert_equal "#{ORIGIN}#{BASE}#{FIRST_PATH}#parallel-systems", URI.join(entry_base, fragment.at_css("a[href='#parallel-systems']")['href']).to_s
    assert_equal "#{ORIGIN}#{BASE}#{FIRST_PATH}appendix/", URI.join(entry_base, fragment.at_css("a[href='./appendix/']")['href']).to_s
    summary = entries[1].at_xpath('a:summary', ATOM)
    assert_equal 'text', summary['type']
    assert_equal 'A fixture about parallel systems & <Notes>.', summary.text
    assert_equal Time.iso8601('2020-03-01T12:00:00+08:00'), Time.iso8601(entries[1].at_xpath('a:updated', ATOM).text)
    refute_includes document.text, 'Future fixture must stay private'
    refute_includes document.text, 'Unpublished fixture must stay private'
    refute_includes document.text, 'Draft fixture must stay private'
  end
end
