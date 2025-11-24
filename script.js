document.addEventListener('DOMContentLoaded', function () {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  const resumePreview = document.getElementById('resumePreview');
  const resumeText = document.getElementById('resumeText');
  const analyzeButton = document.getElementById('analyzeCvButton');
  const analysisResults = document.getElementById('resumeResults');
  const resumeLoading = document.getElementById('resumeLoading');

  // switching between tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(btn.dataset.tab);
      if(panel) panel.classList.add('active');
      resumePreview.style.display = (btn.dataset.tab === 'resumeanalyzer') ? 'block' : 'none';
    });
  });

  // preview the pasted resume by the user
  resumeText.addEventListener('input', () => {
    resumePreview.textContent = resumeText.value || 'Your resume preview will appear here';
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

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function stripHtml(html){
    let div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  }

  async function searchJobs() {
    const query = (jobTitleInput.value || '').trim();
    const location = (locationInput.value || '').trim().toLowerCase();
    jobResults.innerHTML = '';

    // Validating input by the user no numbers , only letters
    if (!query || /^\d+$/.test(query)) {
      jobResults.innerHTML = '<div class="placeholder" style="color:red;">Please enter a valid job title (letters only).</div>';
      return;
    }

    jobLoading.hidden = false;
    try {
      const url = 'https://remotive.com/api/remote-jobs?search=' + encodeURIComponent(query);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Network response was not ok');
      const json = await resp.json();
      let jobs = json.jobs || [];

      // filter by location if the user provided one
      if (location) {
        jobs = jobs.filter(j => {
          const loc = (j.candidate_required_location || '').toLowerCase();
          const title = (j.title || '').toLowerCase();
          const company = (j.company_name || '').toLowerCase();
          return loc.includes(location) || title.includes(location) || company.includes(location);
        });
      }

      if (jobs.length === 0) {
        displayMockJobs(query, location);
      } else {
        displayJobs(jobs);
      }

    } catch (err) {
      console.error('Job fetch error', err);
      jobResults.innerHTML = '<div class="placeholder">Unable to fetch jobs right now. Showing list of example jobs.</div>';
      displayMockJobs(query, location);
    } finally {
      jobLoading.hidden = true;
    }
  }

  function displayJobs(jobs) {
    jobResults.innerHTML = jobs.slice(0, 20).map(j => {
      const loc = j.candidate_required_location ? j.candidate_required_location : 'Remote/Any';
      return `
        <div class="job-card">
          <div class="job-title">${escapeHtml(j.title)}</div>
          <div class="job-company">${escapeHtml(j.company_name)}</div>
          <div class="job-location">${escapeHtml(loc)}</div>
          <div class="job-description">${escapeHtml(stripHtml(j.description).slice(0,250))}...</div>
          <div class="job-meta">
            <a class="apply-button" href="${escapeHtml(j.url)}" target="_blank" rel="noopener">Apply</a>
          </div>
        </div>
      `;
    }).join('');
  }

  function displayMockJobs(query, location) {
    const mockJobs = [
      {
        title: "Frontend Developer",
        company_name: "AMAZON",
        candidate_required_location: "Remote",
        description: "Work on building responsive web interfaces using React and Tailwind CSS.",
        url: "#"
      },
      {
        title: "Backend Engineer",
        company_name: "MICROSOFT",
        candidate_required_location: "Remote",
        description: "Develop and maintain server-side logic using Node.js and Express.",
        url: "#"
      },
      {
        title: "UI/UX Designer",
        company_name: "",
        candidate_required_location: "Remote",
        description: "Design user-friendly interfaces and prototypes for web and mobile applications.",
        url: "#"
      }
    ];

    let filtered = mockJobs;
    if(location){
      filtered = mockJobs.filter(j => j.candidate_required_location.toLowerCase().includes(location));
    }

    displayJobs(filtered);
  }

  //Resume analysis pasted by the user
  analyzeButton.addEventListener('click', analyzeResume);
  function analyzeResume() {
    const text = (resumeText.value || '').trim();
    analysisResults.innerHTML = '';

    //validation if the user did not paste anything
    if (!text) {
      analysisResults.innerHTML = '<div class="placeholder" style="color:red;">Please paste your resume text.</div>';
      return;
    }

    // validation if the resume is too short(too short to analyze)
    if (text.length < 20) {
      analysisResults.innerHTML = '<div class="placeholder" style="color:red;">The resume text is too short to be analyzed</div>';
      return;
    }

    resumeLoading.hidden = false;
    setTimeout(() => {
      const suggestions = performResumeAnalysis(text);
      resumeLoading.hidden = true;
      showAnalysisWithLengthFeedback(text, suggestions);
    }, 500);
  }

  function performResumeAnalysis(text) {
    const suggestions = [];
    const lower = text.toLowerCase();

    // check if the user has contact info (email/phone)
    const hasEmail = /[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/.test(text);
    const hasPhone = /\+?\d[\d\s().-]{6,}\d/.test(text);
    if (!hasEmail || !hasPhone) {
      suggestions.push({ type:'fix', title: 'Add clear contact info', description: 'Include an email address and a phone number at the top of your resume so employers can reach you quickly.' });
    }

    // check for key sections: skills, education, experience
    const hasSkills = /skills?:|technical skills|technologies/i.test(text);
    const hasEducation = /education|university|college|school|degree/i.test(text);
    const hasExperience = /experience|work experience|employment/i.test(text);
    if (!hasSkills) suggestions.push({ type:'add', title:'Add a Skills section', description:'List technical and soft skills (e.g., JavaScript, Git, teamwork). This helps recruiters and automated scanners.' });
    if (!hasEducation) suggestions.push({ type:'add', title:'Add Education information', description:'Include your university, degree, and graduation year (or expected year).' });
    if (!hasExperience) suggestions.push({ type:'note', title:'Highlight experience or projects', description:'If you have  work experience, add project work, contributions, or internships with short descriptions.' });

    // Action verbs
    const actionVerbs = ['managed','developed','led','designed','implemented','created','improved','optimized','organized','collaborated','built','launched','maintained','coordinated','analyzed','resolved','streamlined','facilitated','spearheaded','executed'];
    const hasAction = actionVerbs.some(v => lower.indexOf(v) !== -1);
    if (!hasAction) suggestions.push({ type:'improve', title:'Use action verbs', description:'Use strong action verbs (e.g., "developed", "led", "implemented") to describe your achievements.' });

    // Numbers / metrics
    const hasNumbers = /\d+/.test(text);
    if (!hasNumbers) suggestions.push({ type:'improve', title:'Quantify achievements', description:'Where possible, add numbers to show impact (e.g., "inceased sales by 10%").' });

    // check if the resume is too long or too short
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount > 800) suggestions.push({ type:'trim', title:'Make it concise', description:'Try to keep your resume short and consize — typically one page resume.' });
    if (wordCount < 80) suggestions.push({ type:'expand', title:'Expand details', description:'Your resume is short; add details about projects, responsibilities, skills,or volunteering work you have done.' });

    return suggestions;
  }


  function showAnalysisWithLengthFeedback(text, suggestions) {
    const feedback = [];

    // Too long
    if (text.length > 2000) {
      feedback.push({ title: 'Too long', description: 'Your resume is very long. Consider making it concise.' });
    } 
    // Short but not tiny
    else if (text.length < 150) {
      feedback.push({ title: 'Too short', description: 'Consider adding more details to your resume.' });
    }

    const allSuggestions = [...feedback, ...suggestions];

    if (allSuggestions.length === 0) {
      analysisResults.innerHTML = '<div class="analysis-good">GOOD JOB! Your resume covers key elements.</div>';
      return;
    }

    analysisResults.innerHTML = allSuggestions.map(s => `
      <div class="suggestion-item">
        <strong>${s.title}</strong>
        <p>${s.description}</p>
      </div>
    `).join('');
  }
});
