let pageStart = 1
let maxPage = 10
let totalResultLength = 0
let keywords = [];
let currentKeywordIndex = 0;
let delayTime = 5;
let minTime = 2;
let addresscsv;
let rankResult = [];
let domain;
const statusContainer = document.querySelector('.status-container');
const currentWordElement = document.getElementById('current-word');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const settingsButton = document.getElementById('settings-button');
const settingsModal = document.getElementById('settings-modal');
const closeModal = document.getElementById('close-modal');
const saveSettingsButton = document.getElementById('save-settings');
const resetButton = document.getElementById("reset-btn");



const countryLanguages = {
  us: 'en',
  ir: 'fa',
  de: 'de',
  fr: 'fr',
  jp: 'ja',
};

const browser = window.browser || window.chrome;

resetButton.addEventListener('click', () => {
  localStorage.removeItem('searchData');
  localStorage.removeItem('settingData');
  chrome.windows.getLastFocused(w => {
    chrome.extension.getViews({ type: 'popup', windowId: w.id }).forEach(v => v.close());
  });
})


settingsButton.addEventListener('click', () => {
  settingsModal.style.display = 'flex';
});


closeModal.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

saveSettingsButton.addEventListener('click', () => {
  const maxPagesInput = document.getElementById('max-pages').value;
  const delayTimeInput = document.getElementById('delay-time').value;
  const minTimeInput = document.getElementById('min-time').value

  maxPage = Math.max(1, parseInt(maxPagesInput - 1, 10));
  minTime = Math.max(1, parseInt(minTimeInput, 10));
  delayTime = Math.max(1, parseInt(delayTimeInput, 10));

  settingsModal.style.display = 'none';

  const settingData = {
    maxPage,
    minTime,
    delayTime
  };
  localStorage.setItem('settingData', JSON.stringify(settingData));
});



function updateStatus() {
  statusContainer.style.display = "flex"
  currentWordElement.textContent = keywords[currentKeywordIndex];

  const percentage = Math.round((currentKeywordIndex / keywords.length) * 100);
  progressText.textContent = `${percentage}%`;
  progressBar.style.strokeDashoffset = 176 - (176 * currentKeywordIndex) / keywords.length;
}



document.getElementById("csvUrlInput").addEventListener("change", () => {
  let csv = document.getElementById("csvUrlInput").value
  if (csv && csv.length > 0) {
    document.getElementById("keyword").disabled = true
  } else {
    document.getElementById("keyword").disabled = false
  }
})

document.getElementById("keyword").addEventListener("change", () => {
  let valueKeyword = document.getElementById("keyword").value
  if (valueKeyword && valueKeyword.length > 0) {
    document.getElementById("csvUrlInput").disabled = true
  } else {
    document.getElementById("csvUrlInput").disabled = false
  }
})

window.onload = () => {
  const savedData = JSON.parse(localStorage.getItem('searchData'));
  if (savedData) {
    keywords = savedData.keywords;
    currentKeywordIndex = savedData.currentKeywordIndex;
    rankResult = savedData.rankResult
    domain = savedData.domain
    document.getElementById("domain").value = savedData.domain
    document.getElementById("resume-btn").style.display = "block"
    document.getElementById("search-btn").style.display = "none"
    showPreviousWordWithRank()
  }


  const settingData = JSON.parse(localStorage.getItem('settingData'));
  if (settingData != undefined && settingData != null) {
    minTime = settingData.minTime ? settingData.minTime : minTime
    delayTime = settingData.delayTime ? settingData.delayTime : delayTime
    maxPage = settingData.maxPage ? settingData.maxPage : maxPage
    document.getElementById('max-pages').value = maxPage;
    document.getElementById('delay-time').value = delayTime;
    document.getElementById('min-time').value = minTime
  }
};

function showButtonDownloadCreateFile() {
  document.getElementById("download-btn").style.display = "block"
}

document.getElementById("download-btn").addEventListener("click", () => {
  let csvContent = "Word,Rank\n";

  keywords.forEach((keyword, index) => {
    csvContent += `${keyword},${rankResult[index] == -1 ? "Not Found" : rankResult[index]}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.setAttribute("download", "keyword_ranks.csv");
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  URL.revokeObjectURL(url);
})

document.getElementById("resume-btn").addEventListener("click", () => {
  document.getElementById("resume-btn").disabled = true
  searchNextKeywordWithDelay()
})

function showPreviousWordWithRank() {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = '';
  keywords.forEach((keyword, index) => {

    const resultItem = document.createElement("div");
    resultItem.id = `keyword-${keyword}`
    resultItem.className = "result-item loading-dots";
    resultItem.innerHTML = `${keyword} : <span></span><span></span><span></span>`;
    resultDiv.appendChild(resultItem);
    if (index < rankResult.length) {

      let rank = rankResult[index]
      const resultDiv = document.getElementById(`keyword-${keywords[index]}`);
      if (rank !== -1) {
        rankResult[index] = rank
        resultDiv.className = `result-item green`;
        resultDiv.innerHTML = `${keyword} : Rank ${rank}`;
        const button = document.getElementById("search-btn")
        button.classList.remove("loading");
        button.disabled = false;
      } else {
        resultDiv.className = `result-item red`;
        resultDiv.innerHTML = `${keyword} : Not Found`;
        const button = document.getElementById("search-btn")
        button.classList.remove("loading");
        button.disabled = false;
      }
    }
  });

  statusContainer.style.display = "flex"
  currentWordElement.textContent = "Click to continue";

  const percentage = Math.round((currentKeywordIndex / keywords.length) * 100);
  progressText.textContent = `${percentage}%`;
  progressBar.style.strokeDashoffset = 176 - (176 * currentKeywordIndex) / keywords.length;
}

document.getElementById("search-btn").addEventListener("click", () => {

  let inputValue = document.getElementById("keyword").value
  keywords = inputValue.split('-').map(line => line.trim()).filter(line => line !== '')
  const csvUrl = document.getElementById("csvUrlInput").value;
  let domain = document.getElementById("domain").value;
  document.getElementById("download-btn").style.display = "none"
  if (domain) {
    if (csvUrl) {
      fetchCSVFromUrl(csvUrl)
        .then((csvContent) => {
          keywords = parseCSVContent(csvContent);
          displayKeywords();
          startSearchIfReady(domain);
        })
        .catch((error) => {
          document.getElementById("show-error-file-download").style.display = "block"
        });
    } else if (inputValue) {
      displayKeywords();
      startSearchIfReady(domain);

    }
  }
});


function fetchCSVFromUrl(url) {
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error("The file cannot be downloaded");
      }
      return response.text();
    });
}

function parseCSVContent(csvContent) {
  const lines = csvContent.split("\n");
  return lines.map(line => line.trim()).filter(line => line !== "");
}

function startSearchIfReady(domainSearch) {
  pageStart = 0;
  totalResultLength = 0;
  currentKeywordIndex = 0;

  if (currentKeywordIndex < keywords.length && domainSearch) {
    const button = document.getElementById("search-btn");
    button.classList.add("loading");
    button.disabled = true;
    domain = domainSearch
    saveDataInLocalStorage()
    searchNextKeywordWithDelay();
    document.getElementById("show-error-file-download").style.display = "none"
  }
}

function randomDelay() {
  return Math.floor(Math.random() * (delayTime * 1000 - minTime * 1000 + 1)) + minTime * 1000;
}

async function searchNextKeywordWithDelay() {
  await new Promise(resolve => setTimeout(resolve, randomDelay()));
  searchNextKeyword();
}


function setRank(rank) {

  const resultDiv = document.getElementById(`keyword-${keywords[currentKeywordIndex]}`);
  if (rank !== -1) {
    rankResult[currentKeywordIndex] = rank
    resultDiv.className = `result-item green`;
    resultDiv.innerHTML = `${keywords[currentKeywordIndex]} : Rank ${rank}`;
  } else {

    rankResult.push(-1)
    rankResult[currentKeywordIndex] = -1
    resultDiv.className = `result-item red`;
    resultDiv.innerHTML = `${keywords[currentKeywordIndex]} : Not Found`;
  }
  currentKeywordIndex++;
  updateStatus()
  saveDataInLocalStorage()
  searchNextKeywordWithDelay();
  if (currentKeywordIndex == keywords.length) {
    localStorage.removeItem('searchData');
    showButtonDownloadCreateFile()
    const button = document.getElementById("search-btn")
    button.style.display = "block"
    button.classList.remove("loading");
    button.disabled = false;
    document.getElementById("resume-btn").style.display = "none"
    document.getElementById("resume-btn").disabled = false
    currentWordElement.textContent = "End of search";
    finishProccessFindingWordList()

  }
}

function saveDataInLocalStorage() {
  let domain = document.getElementById("domain").value;
  const data = {
    keywords,
    currentKeywordIndex,
    domain,
    rankResult
  };
  localStorage.setItem('searchData', JSON.stringify(data));
}



async function searchNewPageForWord(resultLenght) {
  await new Promise(resolve => setTimeout(resolve, randomDelay()));
  if (pageStart <= maxPage) {
    totalResultLength = totalResultLength + resultLenght
    pageStart = pageStart + 1
    const keyword = keywords[currentKeywordIndex];
    const countrySelect = document.getElementById('country');
    const selectedCountry = countrySelect.value;
    const language = countryLanguages[selectedCountry] || 'en';

    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&gl=${selectedCountry}&hl=${language}&start=${(pageStart - 1) * 10}`;
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      browser.tabs.update(tabs[0].id, { url: googleSearchUrl });
    });
  } else {
    console.log("2");

    rankResult.push(-1)
    const resultDiv = document.getElementById(`keyword-${keywords[currentKeywordIndex]}`);
    resultDiv.className = `result-item red`;
    resultDiv.innerHTML = `${keywords[currentKeywordIndex]} : Not Found`;
    currentKeywordIndex++;
    updateStatus()
    saveDataInLocalStorage()
    searchNextKeywordWithDelay();

    if (currentKeywordIndex == keywords.length) {
      localStorage.removeItem('searchData');
      showButtonDownloadCreateFile()
      const button = document.getElementById("search-btn")
      button.classList.remove("loading");
      button.disabled = false;
      button.style.display = "block"
      document.getElementById("resume-btn").style.display = "none"
      document.getElementById("resume-btn").disabled = false
      currentWordElement.textContent = "End of search";
      finishProccessFindingWordList()
    }
  }
}


function displayKeywords() {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = '';
  keywords.forEach(keyword => {
    const resultItem = document.createElement("div");
    resultItem.id = `keyword-${keyword}`
    resultItem.className = "result-item loading-dots";
    resultItem.innerHTML = `${keyword} : <span></span><span></span><span></span>`;
    resultDiv.appendChild(resultItem);
  });
}

function searchNextKeyword() {
  if (currentKeywordIndex < keywords.length && domain) {
    const keyword = keywords[currentKeywordIndex];
    pageStart = 1;
    totalResultLength = 0;

    const countrySelect = document.getElementById('country');
    const selectedCountry = countrySelect.value;
    const language = countryLanguages[selectedCountry] || 'en';

    updateStatus()
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&gl=${selectedCountry}&hl=${language}`;
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      browser.tabs.update(tabs[0].id, { url: googleSearchUrl });
    });
  }
}


chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.url.includes('www.google.com/search')) {
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      func: () => {
        const htmlContent = document.documentElement.innerHTML;

        const citeRegex = /<cite.*?>(.*?)<\/cite>/g;
        let match;
        const citeUrlsSet = new Set();

        while ((match = citeRegex.exec(htmlContent)) !== null) {
          citeUrlsSet.add(match[1]);
        }

        const citeUrls = Array.from(citeUrlsSet);
        return citeUrls;
      }
    }, (results) => {
      if (results && results[0]) {
        const resultUrls = results[0].result;
        if (resultUrls.length == 0) {
          document.getElementById("show-captcha").style.display = "block"
        } else {

          let rank = -1;
          for (let i = 0; i < resultUrls.length; i++) {
            const url = resultUrls[i];
            if (url.includes(domain)) {
              rank = i + 1;
              break;
            }
          }

          if (rank == -1) {
            searchNewPageForWord(resultUrls.length)
          } else {
            setRank(rank + totalResultLength)
          }
        }
      }
    });
  }
});


function finishProccessFindingWordList() {

  let csvContent = "Word,Rank\n";
  keywords.forEach((keyword, index) => {
    csvContent += `${keyword},${rankResult[index] == -1 ? "Not Found" : rankResult[index]}\n`;
  });
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.setAttribute("download", "keyword_ranks.csv");
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  URL.revokeObjectURL(url);
}