/* AI tools — prompts live server-side in netlify/functions/ai.mts; this file only defines the UI. */
const LANGS = ['English', 'Hindi', 'Hinglish', 'Bengali', 'Marathi', 'Tamil', 'Telugu', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Spanish', 'French', 'German', 'Arabic'];
const LANG = { k: 'lang', label: 'Output language', type: 'select', options: LANGS };
const TONE = { k: 'tone', label: 'Tone', type: 'select', options: ['Friendly', 'Professional', 'Formal', 'Casual', 'Persuasive', 'Funny', 'Confident', 'Empathetic'] };
const LENGTH = { k: 'length', label: 'Length', type: 'select', options: ['Short', 'Medium', 'Detailed'], value: 'Medium' };
const LEVEL = { k: 'level', label: 'Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'] };

function mdLite(s) {
  return esc(s)
    .replace(/^#{1,6}\s*(.+)$/gm, '<b>$1</b>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code class="mono">$1</code>');
}

function aiTool(id, name, desc, placeholder, fields = []) {
  reg('ai', id, name, desc, root => {
    const list = fields.map(makeField);
    const input = el('textarea', { placeholder, rows: 6 });
    const out = el('div', { class: 'ai-out' });
    let raw = '';
    const go = async () => {
      const text = input.value.trim();
      if (!text) { input.focus(); return toast('Please enter some text first'); }
      run.disabled = true;
      run.replaceChildren(el('span', { class: 'spinner' }), 'Generating…');
      out.textContent = '';
      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: id, input: text, options: readVals(list) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'AI service is busy. Please try again.');
        raw = data.result;
        out.innerHTML = mdLite(raw);
      } catch (e) {
        out.innerHTML = `<span class="err">${esc(e.message)}</span>`;
      } finally {
        run.disabled = false;
        run.replaceChildren('✦ Generate');
      }
    };
    const run = btn('✦ Generate', go, 'accent');
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) go(); });
    root.append(el('div', { class: 'panel' },
      list.length ? el('div', { class: 'fields' }, list.map(x => x.wrap)) : null,
      el('label', { class: 'field' }, el('span', {}, 'Your input'), input),
      el('div', { class: 'row' }, run, btn('Copy', () => copy(raw), 'ghost'), btn('Clear', () => { input.value = ''; out.textContent = ''; raw = ''; }, 'ghost'),
        el('span', { class: 'note', style: 'margin:0' }, 'Tip: Ctrl + Enter to generate')),
      el('div', { style: 'margin-top:16px' }, out)));
  }, { ai: true });
}

aiTool('ai-summarizer', 'AI Text Summarizer', 'Turn long articles, notes or emails into a crisp summary.', 'Paste the article, notes or email you want summarized…', [LENGTH, LANG]);
aiTool('ai-paraphraser', 'AI Paraphraser', 'Rewrite any text in fresh words while keeping the meaning.', 'Paste the text to rewrite…', [TONE, LANG]);
aiTool('ai-grammar', 'AI Grammar Fixer', 'Fix grammar, spelling and punctuation in one click.', 'Paste text with mistakes… e.g. "me and him goes to market yesterday"');
aiTool('ai-email', 'AI Email Writer', 'Describe what you need and get a ready-to-send email.', 'e.g. Ask my manager for 2 days leave next week for my sister\'s wedding', [TONE, LANG]);
aiTool('ai-reply', 'AI Reply Generator', 'Paste any message and get a thoughtful reply.', 'Paste the email / WhatsApp message you received (add what you want to say, optional)…', [TONE, LANG]);
aiTool('ai-translator', 'AI Translator', 'Natural translation between 16 languages, including Hindi.', 'Type or paste text in any language…', [{ k: 'target', label: 'Translate to', type: 'select', options: LANGS, value: 'Hindi' }]);
aiTool('ai-eli5', 'Explain Like I\'m 5', 'Get any topic explained in simple, everyday words.', 'e.g. How does UPI work? / What is inflation?', [LANG]);
aiTool('ai-blog-outline', 'AI Blog Outline Generator', 'Headings, key points and FAQs for your next blog post.', 'Blog topic, e.g. "Best budget smartphones for students"', [LANG]);
aiTool('ai-insta-caption', 'Instagram Caption Generator', 'Scroll-stopping captions with emojis for your posts.', 'Describe your photo/reel, e.g. "sunset chai on the terrace with friends"', [TONE, LANG]);
aiTool('ai-hashtags', 'Hashtag Generator', 'Relevant, trending-style hashtags for any post.', 'What is your post about?', [{ k: 'platform', label: 'Platform', type: 'select', options: ['Instagram', 'YouTube', 'LinkedIn', 'X / Twitter', 'TikTok / Reels'] }]);
aiTool('ai-yt-title', 'YouTube Title Generator', 'Click-worthy, SEO-friendly video titles.', 'What is your video about?', [LANG]);
aiTool('ai-yt-desc', 'YouTube Description Writer', 'Full video description with timestamps and tags.', 'Video topic and key points…', [LANG]);
aiTool('ai-tweet', 'X / Tweet Writer', 'Punchy posts and threads for X (Twitter).', 'Topic or idea for your post…', [TONE, LANG]);
aiTool('ai-linkedin', 'LinkedIn Post Writer', 'Professional posts that get engagement.', 'e.g. I just completed my first year as a software engineer…', [TONE, LANG]);
aiTool('ai-product-desc', 'Product Description Writer', 'Persuasive copy for Amazon, Flipkart, Meesho or your store.', 'Product name and features, e.g. "Cotton kurta, pure handloom, 5 colours, machine washable"', [TONE, LANG]);
aiTool('ai-cover-letter', 'Cover Letter Writer', 'Tailored cover letters from your details and the job role.', 'Job role, company and your key skills/experience…', [TONE]);
aiTool('ai-resume', 'Resume Bullet Improver', 'Turn plain duties into strong, results-driven bullet points.', 'Paste your resume points, e.g. "handled customer calls, made reports"');
aiTool('ai-interview', 'Interview Question Generator', 'Likely questions and sample answers for any job.', 'Job role, e.g. "Frontend developer" or "Bank PO"', [LEVEL]);
aiTool('ai-business-name', 'Business Name Generator', 'Catchy, brandable names for your business or startup.', 'What does your business do? e.g. "home-made pickles delivered in Pune"');
aiTool('ai-story', 'Short Story Writer', 'Original short stories from a simple idea.', 'Story idea, e.g. "a street dog who becomes a hero during monsoon"', [LENGTH, LANG]);
aiTool('ai-poem', 'Poem & Shayari Writer', 'Poems, shayari, haiku and raps on any theme.', 'Theme, e.g. "dosti", "first rain", "missing home"', [{ k: 'style', label: 'Style', type: 'select', options: ['Poem', 'Shayari', 'Haiku', 'Rap verse', 'Limerick', 'Ghazal'] }, LANG]);
aiTool('ai-wishes', 'Wishes & Greetings Writer', 'Heartfelt messages for birthdays, festivals and more.', 'Who is it for? e.g. "my best friend Riya, loves travel"', [{ k: 'occasion', label: 'Occasion', type: 'select', options: ['Birthday', 'Anniversary', 'Diwali', 'Holi', 'Eid', 'Christmas', 'New Year', 'Raksha Bandhan', 'Congratulations', 'Get well soon', 'Farewell', 'Thank you'] }, LANG]);
aiTool('ai-meal-plan', 'AI Meal Planner', 'A 7-day healthy meal plan for your goal and taste.', 'Goal and preferences, e.g. "lose weight, 1800 kcal, like South Indian food"', [{ k: 'diet', label: 'Diet', type: 'select', options: ['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Vegan', 'Jain'] }]);
aiTool('ai-workout', 'AI Workout Planner', 'A weekly workout routine — gym or home.', 'Goal and setup, e.g. "build muscle, home workout, 30 min/day, no equipment"', [LEVEL]);
aiTool('ai-study-plan', 'AI Study Planner', 'A day-by-day study timetable for any exam.', 'Exam, subjects and days left, e.g. "Class 12 boards: Physics, Chemistry, Maths — 45 days"');
aiTool('ai-travel', 'AI Travel Itinerary', 'Day-wise trip plans with places, food and budget tips.', 'e.g. "3 days in Jaipur, budget trip, love forts and street food"');
aiTool('ai-code-explain', 'AI Code Explainer', 'Paste code and get a clear, line-by-line explanation.', 'Paste your code…', [LANG]);
aiTool('ai-sql', 'AI SQL Query Generator', 'Describe what you need in plain words — get SQL.', 'e.g. "top 5 customers by total order amount in 2025, tables: customers(id,name), orders(id,customer_id,amount,created_at)"', [{ k: 'dialect', label: 'Database', type: 'select', options: ['PostgreSQL', 'MySQL', 'SQLite', 'SQL Server', 'Oracle'] }]);
aiTool('ai-regex', 'AI Regex Generator', 'Describe a pattern and get a tested regular expression.', 'e.g. "Indian mobile number starting with 6-9, optional +91"');
aiTool('ai-tone', 'AI Tone Changer', 'Rewrite a message to sound more polite, formal, friendly…', 'Paste the message you want to change…', [{ ...TONE, label: 'Make it sound' }]);
