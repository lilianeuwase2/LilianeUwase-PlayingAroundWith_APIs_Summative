// Simple Job Finder (Remotive) + Resume Analyzer
document.addEventListener('DOMContentLoaded', function () {
  // Tabs
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const id = btn.dataset.tab;
      const panel = document.getElementById(id);
      if (panel) panel.classList.add('active');
    });
  });

  // Job search elements
  const searchButton = document.getElementById('searchButton');
  const jobTitleInput = document.getElementById('jobTitle');
  const locationInput = document.getElementById('location');
  const jobResults = document.getElementById('jobResults');
  const jobLoading = document.getElementById('jobloading');

  searchButton.addEventListener('click', searchJobs);
  jobTitleInput.addEventListener('keydown', function(e){ if(e.key === 'Enter') searchJobs(); });
  locationInput.addEventListener('keydown', function(e){ if(e.key === 'Enter') searchJobs(); });

  async function searchJobs() {
    const query = (jobTitleInput.value || '').trim();
    const location = (locationInput.value || '').trim().toLowerCase();
    jobResults.innerHTML = '';
    if (!query) {
      jobResults.innerHTML = '<div class="placeholder">Please enter a job title or keyword to search.</div>';
      return;
    }
    jobLoading.hidden = false;
    try {
      const url = 'https://remotive.com/api/remote-jobs?search=' + encodeURIComponent(query);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Network response was not ok');
      const json = await resp.json();
      let jobs = json.jobs || [];
      // filter by location if provided (Remotive uses candidate_required_location)
      if (location) {
        jobs = jobs.filter(j => {
          const loc = (j.candidate_required_location || '').toLowerCase();
          const title = (j.title || '').toLowerCase();
          const company = (j.company_name || '').toLowerCase();
          return loc.includes(location) || title.includes(location) || company.includes(location);
        });
      }
      displayJobs(jobs);
    } catch (err) {
      console.error('Job fetch error', err);
      jobResults.innerHTML = '<div class="placeholder">Unable to fetch jobs right now. Showing a couple of example jobs.</div>';
      displayMockJobs(query, location);
    } finally {
      jobLoading.hidden = true;
    }
  }

  function displayJobs(jobs) {
    if (!jobs || jobs.length === 0) {
      jobResults.innerHTML = '<div class="placeholder">No jobs found matching your criteria.</div>';
      return;
    }
    jobResults.innerHTML = jobs.slice(0, 20).map(j => {
      const date = j.publication_date ? new Date(j.publication_date).toLocaleDateString() : '';
      const loc = j.candidate_required_location ? j.candidate_required_location : 'Remote/Any';
      return `
        <div class="job-card">
          <div class="job-title">${escapeHtml(j.title)}</div>
          <div class="job-company">${escapeHtml(j.company_name)}</div>
          <div class="job-location">${escapeHtml(loc)}</div>
          <div class="job-description">${escapeHtml(stripHtml(j.description).slice(0,250))}...</div>
          <div class="job-meta">
            <a class="apply-button" href="${escapeAttr(j.url)}" target="_blank" rel="noopener">Apply</a>
            <div>Type: ${escapeHtml(j.job_type || 'N/A')}</div>
            <div>Posted: ${escapeHtml(date)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function displayMockJobs(query, location) {
    const mock = [
      { title: query || 'Software Engineer', company_name: 'Example Co', candidate_required_location: location || 'Remote', description: 'An example job used when the API cannot be reached.', url: 'https://example.com', job_type: 'Full-time', publication_date: new Date().toISOString() },
      { title: 'Frontend Developer', company_name: 'Acme', candidate_required_location: location || 'Remote', description: 'Build interfaces for web apps.', url: 'https://example.com', job_type: 'Contract', publication_date: new Date().toISOString() }
    ];
    displayJobs(mock);
  }

  // Simple helpers to avoid XSS in inserted HTML
  function escapeHtml(s){ return (s===null||s===undefined)?'':String(s).replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]; }); }
  function escapeAttr(s){ return escapeHtml(s).replace(/"/g, '&quot;'); }
  function stripHtml(html){ return String(html || '').replace(/<[^>]*>/g, ''); }

  // Resume analyzer
  const analyzeButton = document.getElementById('analyzeButton');
  const resumeText = document.getElementById('resumeText');
  const analysisResults = document.getElementById('resumeResults');
  const resumeLoading = document.getElementById('resumeLoading');

  analyzeButton.addEventListener('click', analyzeResume);

  function analyzeResume() {
    const text = (resumeText.value || '').trim();
    analysisResults.innerHTML = '';
    if (!text) {
      analysisResults.innerHTML = '<div class="placeholder">Please paste your resume text to analyze.</div>';
      return;
    }
    resumeLoading.hidden = false;
    // Simulate small delay so user sees loading state
    setTimeout(function(){
      const suggestions = performResumeAnalysis(text);
      resumeLoading.hidden = true;
      showAnalysis(suggestions);
    }, 700);
  }

  function performResumeAnalysis(text) {
    const suggestions = [];
    const lower = text.toLowerCase();

    // Check for contact info: email and phone-like pattern
    const hasEmail = /[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/.test(text);
    const hasPhone = /\+?\d[\d\s().-]{6,}\d/.test(text);
    if (!hasEmail || !hasPhone) {
      suggestions.push({ type:'fix', title: 'Add clear contact info', description: 'Include a professional email address and a phone number at the top of your resume so employers can reach you quickly.' });
    }

    // Check for section words (education/skills/experience)
    const hasSkills = /skills?:|technical skills|technologies/i.test(text);
    const hasEducation = /education|university|college|school|degree/i.test(text);
    const hasExperience = /experience|work experience|employment/i.test(text);
    if (!hasSkills) suggestions.push({ type:'add', title:'Add a Skills section', description:'List technical and soft skills (e.g., JavaScript, Git, teamwork). This helps recruiters and automated scanners.' });
    if (!hasEducation) suggestions.push({ type:'add', title:'Add Education information', description:'Include your university, degree, and graduation year (or expected year).' });
    if (!hasExperience) suggestions.push({ type:'note', title:'Highlight experience or projects', description:'If you have little formal work experience, add project work, contributions, or internships with short descriptions.' });

    // Action verbs
    const actionVerbs = ['managed','developed','led','designed','implemented','created','improved','optimized','organized','collaborated','built','launched','maintained'];
    const hasAction = actionVerbs.some(v => lower.indexOf(v) !== -1);
    if (!hasAction) suggestions.push({ type:'improve', title:'Use action verbs', description:'Use strong action verbs (e.g., "developed", "led", "implemented") to describe your achievements.' });

    // Numbers / metrics
    const hasNumbers = /\d+/.test(text);
    if (!hasNumbers) suggestions.push({ type:'improve', title:'Quantify achievements', description:'Where possible, add numbers to show impact (e.g., "reduced load time by 30%").' });

    // Length check (simple)
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount > 800) suggestions.push({ type:'trim', title:'Make it concise', description:'Try to keep your resume short and focused — typically 1 page for early-career applicants.' });
    if (wordCount < 80) suggestions.push({ type:'expand', title:'Expand details', description:'Your resume is short; add details about projects, responsibilities, or skills.' });

    return suggestions;
  }

  function showAnalysis(suggestions) {
    if (!suggestions || suggestions.length === 0) {
      analysisResults.innerHTML = '<div class="analysis-good"><strong>Good job!</strong><p>Your resume includes many key elements. Consider tailoring it per job.</p></div>';
      return;
    }
    analysisResults.innerHTML = suggestions.map(s => `
      <div class="suggestion-item">
        <strong>${escapeHtml(s.title)}</strong>
        <p>${escapeHtml(s.description)}</p>
      </div>
    `).join('');
  }
});
