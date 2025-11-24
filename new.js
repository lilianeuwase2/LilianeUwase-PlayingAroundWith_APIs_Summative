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

    // VALIDATION
    if (!query) {
      jobResults.innerHTML = '<div class="placeholder">Please enter a job title or keyword to search.</div>';
      return;
    }

    jobLoading.hidden = false;

    try {
      const url = 'https://remotive.com/api/remote-jobs?search=' + encodeURIComponent(query);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Network Error');

      const json = await resp.json();
      let jobs = json.jobs || [];

      if (location) {
        jobs = jobs.filter(j => {
          const loc = (j.candidate_required_location || '').toLowerCase();
          return loc.includes(location);
        });
      }

      displayJobs(jobs);
    } catch (err) {
      console.error(err);
      jobResults.innerHTML = '<div class="placeholder">Could not fetch jobs. Showing sample jobs.</div>';
      displayMockJobs(query, location);
    } finally {
      jobLoading.hidden = true;
    }
  }

  function displayJobs(jobs) {
    if (!jobs || jobs.length === 0) {
      jobResults.innerHTML = '<div class="placeholder">No jobs found.</div>';
      return;
    }

    jobResults.innerHTML = jobs.slice(0, 15).map(j => {
      const date = j.publication_date ? new Date(j.publication_date).toLocaleDateString() : '';
      return `
        <div class="job-card">
          <div class="job-title">${escapeHtml(j.title)}</div>
          <div class="job-company">${escapeHtml(j.company_name)}</div>
          <div class="job-location">${escapeHtml(j.candidate_required_location)}</div>
          <div class="job-description">${escapeHtml(stripHtml(j.description).slice(0,200))}...</div>

          <div class="job-meta">
            <a class="apply-button" href="${escapeAttr(j.url)}" target="_blank">Apply</a>
            <div>${escapeHtml(j.job_type || 'N/A')}</div>
            <div>Posted: ${escapeHtml(date)}</div>
          </div>

          <div class="match-score" data-description="${escapeAttr(stripHtml(j.description))}">
            <button class="match-btn">Check Match Score</button>
            <p class="match-output"></p>
            <div class="skills-output"></div>
          </div>
        </div>
      `;
    }).join('');

    // Attach match score buttons
    document.querySelectorAll('.match-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const container = e.target.parentElement;
        const jobDesc = container.dataset.description || '';

        const output = container.querySelector('.match-output');
        const skillsOutput = container.querySelector('.skills-output');

        calculateMatchScore(jobDesc, output, skillsOutput);
      });
    });
  }

  function displayMockJobs(query, location) {
    const mock = [
      {
        title: query || "Software Engineer",
        company_name: "ExampleCorp",
        candidate_required_location: location || "Remote",
        description: "React, HTML, CSS, JavaScript, teamwork, problem-solving.",
        url: "#",
        job_type: "Full-time",
        publication_date: new Date().toISOString()
      }
    ];
    displayJobs(mock);
  }

  function escapeHtml(s){
    return (s===null||s===undefined)?'':String(s).replace(/[&<>"']/g,
      m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function escapeAttr(s){ return escapeHtml(s).replace(/"/g, '&quot;'); }
  function stripHtml(html){ return String(html || '').replace(/<[^>]*>/g, ''); }

  // Resume analyzer
  const analyzeButton = document.getElementById('analyzeButton');
  const resumeText = document.getElementById('resumeText');
  const analysisResults = document.getElementById('analysisResults');
  const resumeLoading = document.getElementById('resumeloading');

  // LIVE CV PREVIEW
  const previewBox = document.createElement('div');
  previewBox.id = "resumePreview";
  previewBox.className = "resume-preview";
  resumeText.insertAdjacentElement("afterend", previewBox);

  resumeText.addEventListener('input', () => {
    previewBox.innerHTML = resumeText.value
      .replace(/\n/g, "<br>")
      .replace(/(Skills|Experience|Education)/gi, "<strong>$1</strong>");
  });

  analyzeButton.addEventListener('click', analyzeResume);

  function analyzeResume() {
    const text = (resumeText.value || '').trim();
    analysisResults.innerHTML = '';

    if (!text) {
      analysisResults.innerHTML = '<div class="placeholder">Paste your resume first.</div>';
      return;
    }

    resumeLoading.hidden = false;

    setTimeout(() => {
      const suggestions = performResumeAnalysis(text);
      resumeLoading.hidden = true;
      showAnalysis(suggestions);

      updateStrengthMeter(text);
    }, 600);
  }

  function performResumeAnalysis(text) {
    const issues = [];
    const lower = text.toLowerCase();

    if (!/skills/i.test(text)) {
      issues.push({title:"Add a Skills section", description:"Skills help recruiters scan your resume faster."});
    }
    if (!/experience/i.test(text)) {
      issues.push({title:"Add Experience or Projects", description:"Include personal or school projects if you lack work experience."});
    }
    if (!/education|university|degree/i.test(text)) {
      issues.push({title:"Add Education", description:"Include university, degree and expected graduation year."});
    }

    if (!/\d+/.test(text)) {
      issues.push({title:"Add numbers", description:"Numbers show impact (e.g., Built a website used by 200 students)."});
    }

    return issues;
  }

  function showAnalysis(issues) {
    if (issues.length === 0) {
      analysisResults.innerHTML = "<p class='analysis-good'>Your resume looks good!</p>";
      return;
    }

    analysisResults.innerHTML = issues.map(x => `
      <div class="suggestion-item">
        <strong>${x.title}</strong>
        <p>${x.description}</p>
      </div>
    `).join('');
  }

  // ⭐ MATCH SCORE + MISSING SKILLS DETECTOR
  function calculateMatchScore(jobDescription, scoreEl, skillsEl) {
    const resume = (resumeText.value || "").toLowerCase();
    const jobWords = jobDescription.toLowerCase().split(/\W+/);

    // COMMON SKILLS LIST
    const skillKeywords = [
      "javascript","html","css","react","node","python",
      "communication","teamwork","leadership","problem solving",
      "planning","excel","sql","design","networking","linux"
    ];

    const jobSkills = skillKeywords.filter(skill => jobDescription.toLowerCase().includes(skill));
    const resumeSkills = skillKeywords.filter(skill => resume.includes(skill));

    // MISSING SKILLS
    const missing = jobSkills.filter(skill => !resumeSkills.includes(skill));

    // MATCH SCORE
    const matchFound = jobWords.filter(word => resume.includes(word)).length;
    const matchScore = Math.round((matchFound / jobWords.length) * 100);

    scoreEl.textContent = "Match Score: " + matchScore + "%";

    skillsEl.innerHTML = `
      <p><strong>Skills required: </strong> ${jobSkills.join(", ") || "Not detected"}</p>
      <p><strong>Your skills: </strong> ${resumeSkills.join(", ") || "None found"}</p>
      <p style="color:red;"><strong>Missing skills: </strong> ${missing.join(", ") || "None 🎉"}</p>
    `;
  }

  // ⭐ RESUME STRENGTH METER
  function updateStrengthMeter(text) {
    let meter = document.getElementById("strengthMeter");
    if (!meter) {
      meter = document.createElement("div");
      meter.id = "strengthMeter";
      meter.className = "strength-meter";
      analysisResults.insertAdjacentElement("beforebegin", meter);
    }

    const score =
      (text.length > 150 ? 40 : 0) +
      (/skills/i.test(text) ? 20 : 0) +
      (/experience/i.test(text) ? 20 : 0) +
      (/education/i.test(text) ? 20 : 0);

    meter.innerHTML = `
      <p><strong>Resume Strength: ${score}%</strong></p>
      <div class="meter-bar"><div style="width:${score}%"></div></div>
    `;
  }

});
